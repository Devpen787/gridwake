"""Executable balance and determinism reference for the GRIDWAKE design.

This is a deliberately small sector-level reference, not production game code.
It specifies integer arithmetic, simultaneous action aggregation, a portable PRNG,
law bounds, replay hashing, and sensitivity experiments. A future cell-level
engine must publish its own vectors and demonstrate parity with its own canonical
contract; passing this reference alone is not a production security proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from dataclasses import asdict, dataclass
from math import isqrt
from pathlib import Path
from typing import Iterable, Mapping, Sequence


SECTORS = 8
ROUND_TICKS = 600
PRESSURE_MAX = 10_000
HEALTH_MAX = 10_000
EXPOSURE_FLOOR = 5_000
BASE_DEFENSE = 40
CONGESTION_PER_EXTRA = 12
SYNERGY_PER_LIGHT = 8
PULSE_STRENGTH_DEFAULT = 220
SAFE_LAW_FIELDS = {
    "corruption_permille",
    "defense_permille",
    "pulse_strength",
    "repair_distinct_players",
}


@dataclass(frozen=True)
class Law:
    corruption_permille: int = 1_000
    defense_permille: int = 1_000
    pulse_strength: int = PULSE_STRENGTH_DEFAULT
    repair_distinct_players: int = 2


LAW_BOUNDS: Mapping[str, tuple[int, int]] = {
    "corruption_permille": (800, 1_200),
    "defense_permille": (900, 1_100),
    "pulse_strength": (120, 320),
    "repair_distinct_players": (2, 3),
}


@dataclass(frozen=True)
class StepResult:
    pressure: tuple[int, ...]
    health: int
    rng_state: int
    defense: tuple[int, ...]
    growth: tuple[int, ...]
    pulse_effect: tuple[int, ...]


@dataclass(frozen=True)
class RoundResult:
    players: int
    seed: int
    policy: str
    law: Law
    ticks_completed: int
    health: int
    pressure: tuple[int, ...]
    pulses_used: int
    shared_win: bool
    replay_hash: str


def clamp(value: int, low: int, high: int) -> int:
    if low > high:
        raise ValueError("low must not exceed high")
    return min(high, max(low, value))


def lcg_next(state: int) -> int:
    """32-bit Numerical Recipes LCG; portable because overflow is explicit."""

    return (1_664_525 * (state & 0xFFFFFFFF) + 1_013_904_223) & 0xFFFFFFFF


def validate_law_object(candidate: Mapping[str, object]) -> Law:
    unknown = set(candidate) - SAFE_LAW_FIELDS
    if unknown:
        raise ValueError(f"unknown or immutable law fields: {sorted(unknown)}")

    values = asdict(Law())
    for field, raw in candidate.items():
        if isinstance(raw, bool) or not isinstance(raw, int):
            raise ValueError(f"{field} must be an integer")
        low, high = LAW_BOUNDS[field]
        if not low <= raw <= high:
            raise ValueError(f"{field} outside safe range [{low}, {high}]")
        values[field] = raw
    return Law(**values)


def corruption_budget(players: int, law: Law = Law()) -> int:
    """Per-tick room pressure.

    Exact baseline: B(n) = 15 + 24n + floor(sqrt(100n)), for 2 <= n <= 24.
    The world law multiplies this by a bounded permille using floor division.
    """

    if not 2 <= players <= 24:
        raise ValueError("public rooms require between 2 and 24 active players")
    baseline = 15 + 24 * players + isqrt(100 * players)
    return baseline * law.corruption_permille // 1_000


def sector_defense(contributors: int, law: Law = Law()) -> int:
    """Diminishing same-sector defense plus distinct-light synergy.

    D(k) = floor(40*k*100/(100+12*(k-1))) + 8*min(k,4), when k >= 2.
    One contributor receives no synergy. The result is law-scaled by permille.
    """

    if contributors < 0:
        raise ValueError("contributors must be non-negative")
    if contributors == 0:
        return 0
    congestion_denominator = 100 + CONGESTION_PER_EXTRA * (contributors - 1)
    base = BASE_DEFENSE * contributors * 100 // congestion_denominator
    synergy = SYNERGY_PER_LIGHT * min(contributors, 4) if contributors >= 2 else 0
    return (base + synergy) * law.defense_permille // 1_000


def canonical_step(
    pressure: Sequence[int],
    health: int,
    actions: Iterable[int],
    pulse_targets: Iterable[int],
    players: int,
    rng_state: int,
    law: Law = Law(),
) -> StepResult:
    """Resolve one simultaneous sector-level tick.

    `actions` and `pulse_targets` are multisets. Their input order has no effect.
    The caller owns the per-player pulse ledger; this function accepts no more
    pulse events than there are active players. Simultaneous pulses stack by
    count, so input order and an arbitrary "first" sender cannot change effect.
    """

    if len(pressure) != SECTORS:
        raise ValueError(f"pressure must contain {SECTORS} sectors")
    if any(isinstance(v, bool) or not isinstance(v, int) for v in pressure):
        raise ValueError("pressure values must be integers")
    if not 0 <= health <= HEALTH_MAX:
        raise ValueError("health outside canonical range")

    action_list = list(actions)
    pulse_list = list(pulse_targets)
    if len(action_list) > players:
        raise ValueError("more contribution actions than active players")
    if len(pulse_list) > players:
        raise ValueError("more pulse actions than active players")
    if any(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v < SECTORS for v in action_list):
        raise ValueError("invalid action sector")
    if any(isinstance(v, bool) or not isinstance(v, int) or not 0 <= v < SECTORS for v in pulse_list):
        raise ValueError("invalid pulse sector")

    counts = Counter(action_list)
    defense = tuple(sector_defense(counts.get(i, 0), law) for i in range(SECTORS))

    budget = corruption_budget(players, law)
    base, remainder = divmod(budget, SECTORS)
    next_rng = lcg_next(rng_state)
    start = next_rng % SECTORS
    growth_values = [base] * SECTORS
    for offset in range(remainder):
        growth_values[(start + offset) % SECTORS] += 1
    growth = tuple(growth_values)

    pulse_counts = Counter(pulse_list)
    pulse_effect = tuple(law.pulse_strength * pulse_counts.get(i, 0) for i in range(SECTORS))

    next_pressure = tuple(
        clamp(pressure[i] + growth[i] - defense[i] - pulse_effect[i], 0, PRESSURE_MAX)
        for i in range(SECTORS)
    )
    exposure = sum(max(0, value - EXPOSURE_FLOOR) for value in next_pressure)
    health_delta = 10 if exposure == 0 else -(exposure // 120)
    next_health = clamp(health + health_delta, 0, HEALTH_MAX)
    return StepResult(next_pressure, next_health, next_rng, defense, growth, pulse_effect)


def choose_actions(policy: str, pressure: Sequence[int], players: int) -> list[int]:
    ranked_high = sorted(range(SECTORS), key=lambda sector: (-pressure[sector], sector))
    ranked_low = list(reversed(ranked_high))
    if policy == "balanced":
        return [ranked_high[index % SECTORS] for index in range(players)]
    if policy == "herd":
        # A fixed social focal point models a crowd that keeps following the
        # same beacon even after the rest of the grid changes.
        return [0] * players
    if policy == "waste":
        return [ranked_low[0]] * players
    if policy == "idle":
        return []
    raise ValueError(f"unknown policy: {policy}")


def canonical_event_bytes(event: Mapping[str, object]) -> bytes:
    return json.dumps(event, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def run_round(players: int, seed: int, policy: str = "balanced", law: Law = Law()) -> RoundResult:
    pressure: tuple[int, ...] = tuple(1_000 + ((seed + 97 * i) % 211) for i in range(SECTORS))
    health = HEALTH_MAX
    rng_state = seed & 0xFFFFFFFF
    pulse_remaining = players
    pulses_used = 0
    replay = hashlib.sha256()

    header = {
        "contract": "gridwake-sector-reference-v1",
        "players": players,
        "seed": seed,
        "policy": policy,
        "law": asdict(law),
        "initial_pressure": pressure,
        "initial_health": health,
    }
    replay.update(canonical_event_bytes(header))

    ticks_completed = 0
    for tick in range(ROUND_TICKS):
        actions = choose_actions(policy, pressure, players)
        pulse_targets: list[int] = []
        # The reference spends at most one room pulse per tick once health is low.
        # A production ledger is per player; tests cover the <= players invariant.
        if policy == "balanced" and health < 6_000 and pulse_remaining > 0:
            pulse_targets = [max(range(SECTORS), key=lambda i: (pressure[i], -i))]
            pulse_remaining -= 1
            pulses_used += 1

        step = canonical_step(pressure, health, actions, pulse_targets, players, rng_state, law)
        event = {
            "tick": tick,
            "actions": sorted(Counter(actions).items()),
            "pulse_targets": sorted(Counter(pulse_targets).items()),
            "pressure": step.pressure,
            "health": step.health,
            "rng_state": step.rng_state,
        }
        replay.update(canonical_event_bytes(event))
        pressure, health, rng_state = step.pressure, step.health, step.rng_state
        ticks_completed = tick + 1
        if health == 0:
            break

    return RoundResult(
        players=players,
        seed=seed,
        policy=policy,
        law=law,
        ticks_completed=ticks_completed,
        health=health,
        pressure=pressure,
        pulses_used=pulses_used,
        shared_win=health > 0 and ticks_completed == ROUND_TICKS,
        replay_hash=replay.hexdigest(),
    )


def sensitivity(seed_count: int = 200) -> dict[str, object]:
    if seed_count <= 0:
        raise ValueError("seed_count must be positive")
    room_sizes = [2, 4, 8, 16, 24]
    policies = ["balanced", "herd", "waste", "idle"]
    results: dict[str, object] = {
        "contract": "gridwake-sector-reference-v1",
        "seeds_per_cell": seed_count,
        "warning": "design calibration evidence only; not production telemetry or engine parity",
        "cells": [],
    }
    cells = results["cells"]
    assert isinstance(cells, list)
    for players in room_sizes:
        for policy in policies:
            rounds = [run_round(players, seed, policy) for seed in range(1, seed_count + 1)]
            wins = sum(result.shared_win for result in rounds)
            cells.append(
                {
                    "players": players,
                    "policy": policy,
                    "wins": wins,
                    "losses": seed_count - wins,
                    "win_rate_permille": wins * 1_000 // seed_count,
                    "health_min": min(result.health for result in rounds),
                    "health_median": sorted(result.health for result in rounds)[seed_count // 2],
                    "health_max": max(result.health for result in rounds),
                    "pulses_max": max(result.pulses_used for result in rounds),
                }
            )
    return results


def golden_vectors() -> dict[str, object]:
    law = Law()
    step_a = canonical_step((1_000,) * SECTORS, 10_000, [0, 1, 1, 7], [3], 4, 123, law)
    step_b = canonical_step((1_000,) * SECTORS, 10_000, [7, 1, 0, 1], [3], 4, 123, law)
    rounds = [
        run_round(2, 1, "balanced"),
        run_round(4, 42, "balanced"),
        run_round(8, 42, "herd"),
        run_round(24, 999, "balanced", validate_law_object({"corruption_permille": 1_200})),
    ]
    return {
        "contract": "gridwake-sector-reference-v1",
        "constants": {
            "sectors": SECTORS,
            "round_ticks": ROUND_TICKS,
            "pressure_max": PRESSURE_MAX,
            "health_max": HEALTH_MAX,
            "exposure_floor": EXPOSURE_FLOOR,
            "law_bounds": LAW_BOUNDS,
        },
        "budgets": {str(n): corruption_budget(n) for n in range(2, 25)},
        "defense": {str(k): sector_defense(k) for k in range(0, 25)},
        "order_invariant_step_a": asdict(step_a),
        "order_invariant_step_b": asdict(step_b),
        "rounds": [asdict(result) for result in rounds],
    }


def write_artifacts(directory: Path, seed_count: int) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "golden_vectors.json").write_text(
        json.dumps(golden_vectors(), indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (directory / "sensitivity_report.json").write_text(
        json.dumps(sensitivity(seed_count), indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-artifacts", action="store_true")
    parser.add_argument("--seed-count", type=int, default=200)
    args = parser.parse_args()
    if args.write_artifacts:
        write_artifacts(Path(__file__).resolve().parent, args.seed_count)
    else:
        print(json.dumps(golden_vectors(), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
