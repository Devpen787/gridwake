import json
import unittest
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from gridwake_reference import (
    HEALTH_MAX,
    LAW_BOUNDS,
    PRESSURE_MAX,
    ROUND_TICKS,
    SECTORS,
    Law,
    canonical_event_bytes,
    canonical_step,
    corruption_budget,
    golden_vectors,
    lcg_next,
    run_round,
    sector_defense,
    sensitivity,
    validate_law_object,
)


class MathContractTests(unittest.TestCase):
    def test_corruption_budget_is_monotone_and_bounded_for_public_room_sizes(self):
        budgets = [corruption_budget(n) for n in range(2, 25)]
        self.assertEqual(budgets, sorted(budgets))
        self.assertEqual(len(set(budgets)), len(budgets))

    def test_out_of_range_room_size_rejected(self):
        for players in (0, 1, 25, 999):
            with self.assertRaises(ValueError):
                corruption_budget(players)

    def test_defense_is_nonnegative_and_per_light_effectiveness_declines_after_synergy(self):
        values = [sector_defense(k) for k in range(25)]
        self.assertTrue(all(value >= 0 for value in values))
        # Integer floors can make individual marginal steps wobble by one. The
        # exact congestion property is that defense per light never increases
        # after the two-light synergy threshold.
        for k in range(2, 24):
            self.assertGreaterEqual(values[k] * (k + 1), values[k + 1] * k)

    def test_law_bounds_accept_edges(self):
        for field, (low, high) in LAW_BOUNDS.items():
            self.assertEqual(getattr(validate_law_object({field: low}), field), low)
            self.assertEqual(getattr(validate_law_object({field: high}), field), high)

    def test_law_bounds_reject_escape_unknown_float_and_bool(self):
        bad = [
            {"authentication": 0},
            {"corruption_permille": 799},
            {"corruption_permille": 1_201},
            {"pulse_strength": 220.0},
            {"pulse_strength": True},
        ]
        for candidate in bad:
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                validate_law_object(candidate)

    def test_integer_prng_vector(self):
        state = 0
        observed = []
        for _ in range(5):
            state = lcg_next(state)
            observed.append(state)
        self.assertEqual(observed, [1013904223, 1196435762, 3519870697, 2868466484, 1649599747])


class ResolutionInvariantTests(unittest.TestCase):
    def test_action_arrival_order_does_not_change_step(self):
        first = canonical_step((1_000,) * SECTORS, HEALTH_MAX, [0, 1, 1, 7], [3], 4, 123)
        second = canonical_step((1_000,) * SECTORS, HEALTH_MAX, [7, 1, 0, 1], [3], 4, 123)
        self.assertEqual(first, second)

    def test_simultaneous_pulses_stack_without_order_dependence(self):
        first = canonical_step((1_000,) * SECTORS, HEALTH_MAX, [], [3, 3, 1], 3, 123)
        second = canonical_step((1_000,) * SECTORS, HEALTH_MAX, [], [1, 3, 3], 3, 123)
        self.assertEqual(first, second)
        self.assertEqual(first.pulse_effect[3], 440)
        self.assertEqual(first.pulse_effect[1], 220)

    def test_identity_relabeling_cannot_change_aggregate_step(self):
        actions_by_player = {"alpha": 0, "beta": 2, "gamma": 2, "delta": 7}
        relabeled = {"z": 7, "q": 2, "m": 0, "n": 2}
        self.assertEqual(Counter(actions_by_player.values()), Counter(relabeled.values()))
        first = canonical_step((2_000,) * SECTORS, 9_000, actions_by_player.values(), [], 4, 99)
        second = canonical_step((2_000,) * SECTORS, 9_000, relabeled.values(), [], 4, 99)
        self.assertEqual(first, second)

    def test_bounds_hold_under_extreme_valid_state(self):
        result = canonical_step((PRESSURE_MAX,) * SECTORS, 1, list(range(SECTORS)) * 3, [], 24, 0)
        self.assertTrue(all(0 <= value <= PRESSURE_MAX for value in result.pressure))
        self.assertTrue(0 <= result.health <= HEALTH_MAX)

    def test_invalid_state_and_action_counts_rejected(self):
        bad_calls = [
            lambda: canonical_step((0,) * 7, 10_000, [], [], 2, 0),
            lambda: canonical_step((0,) * 8, 10_001, [], [], 2, 0),
            lambda: canonical_step((0,) * 8, 10_000, [8], [], 2, 0),
            lambda: canonical_step((0,) * 8, 10_000, [0, 1, 2], [], 2, 0),
            lambda: canonical_step((0,) * 8, 10_000, [], [0, 1, 2], 2, 0),
        ]
        for call in bad_calls:
            with self.assertRaises(ValueError):
                call()

    def test_canonical_json_independent_of_mapping_order(self):
        self.assertEqual(canonical_event_bytes({"b": 2, "a": 1}), canonical_event_bytes({"a": 1, "b": 2}))


class ReplayAndSensitivityTests(unittest.TestCase):
    def test_same_inputs_have_identical_round_and_hash(self):
        self.assertEqual(run_round(8, 42, "balanced"), run_round(8, 42, "balanced"))

    def test_seed_or_policy_changes_replay_hash(self):
        hashes = {
            run_round(8, 42, "balanced").replay_hash,
            run_round(8, 43, "balanced").replay_hash,
            run_round(8, 42, "herd").replay_hash,
        }
        self.assertEqual(len(hashes), 3)

    def test_round_contract_and_pulse_budget_hold_across_corpus(self):
        for players in (2, 4, 8, 16, 24):
            for seed in range(1, 31):
                for policy in ("balanced", "herd", "waste", "idle"):
                    result = run_round(players, seed, policy)
                    self.assertLessEqual(result.pulses_used, players)
                    self.assertLessEqual(result.ticks_completed, ROUND_TICKS)
                    self.assertTrue(0 <= result.health <= HEALTH_MAX)
                    self.assertTrue(all(0 <= value <= PRESSURE_MAX for value in result.pressure))

    def test_coordination_outperforms_herding_in_seed_sweep(self):
        report = sensitivity(seed_count=40)
        cells = {(cell["players"], cell["policy"]): cell for cell in report["cells"]}
        for players in (2, 4, 8, 16, 24):
            balanced = cells[(players, "balanced")]
            herd = cells[(players, "herd")]
            self.assertGreater(balanced["health_median"], herd["health_median"])

    def test_checked_in_golden_vectors_match_reference(self):
        path = Path(__file__).with_name("golden_vectors.json")
        checked_in = json.loads(path.read_text(encoding="utf-8"))
        normalized_reference = json.loads(json.dumps(golden_vectors(), sort_keys=True))
        self.assertEqual(checked_in, normalized_reference)


if __name__ == "__main__":
    unittest.main()
