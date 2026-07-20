"""Independent integer reference for GRIDWAKE Instinct Runtime v1.

This proves cross-language parity for bounded policy compilation. It does not
prove browser-client cheat resistance, model interpretation, or multiplayer
authority.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


GRID_ROWS = 18
PULSE_CLEAR_CAP = 6
PULSE_SHIELD_TICKS = 12
SIGNALS = {
    "core": ["core", "protect", "guard", "center", "centre", "ring", "circle", "circles", "orbit", "light", "hold"],
    "edge": ["edge", "edges", "weak", "weakest", "pressure", "spread", "scout", "wide", "perimeter"],
    "link": ["ally", "allies", "together", "link", "linked", "repair", "repairs", "reinforce", "crossing", "chain", "trail"],
    "response": ["attack", "kill", "intercept", "engage", "defend", "chase", "pursue", "return", "send"],
    "pulse": ["pulse", "danger", "peak"],
    "aggressive": ["aggressive", "aggressively", "rush", "hunt", "hunter", "fast", "kill", "attack"],
    "cautious": ["cautious", "safe", "careful", "tight", "patient", "only", "return"],
    "disciplined": ["disciplined", "precise", "precisely", "steady", "exact", "tightly"],
    "organic": ["organic", "naturally", "flow", "swarm", "fluid"],
    "erratic": ["random", "randomly", "unpredictable", "unpredictably", "erratic", "chaotic", "chaos"],
}

EXAMPLES = {
    "ring": "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.",
    "edge": "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.",
    "link": "Link together organically, reinforce every ally trail, and send one unit to nearby threats before returning.",
    "ten_percent_ring": "Go in circles around the light and only attack anything within 10%; send two and do not chase.",
}


def normalize(source: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", source)).strip()[:280]


def has_word(source: str, word: str) -> bool:
    return re.search(rf"(?:^|[^a-z]){re.escape(word)}(?:$|[^a-z])", source, re.IGNORECASE) is not None


def has_phrase(source: str, phrases: list[str]) -> bool:
    lowered = source.lower()
    return any(phrase in lowered for phrase in phrases)


def matches(source: str, group: str) -> list[str]:
    return [word for word in SIGNALS[group] if has_word(source, word)]


def allocate(core_hits: int, edge_hits: int, link_hits: int) -> dict[str, int]:
    raw = [2 + core_hits * 3, 2 + edge_hits * 3, 2 + link_hits * 3]
    total = sum(raw)
    scaled = [value * 100 for value in raw]
    result = [value // total for value in scaled]
    remainder = 100 - sum(result)
    order = sorted(range(3), key=lambda index: (-(scaled[index] % total), index))
    for index in order[:remainder]:
        result[index] += 1
    return dict(zip(("core", "edge", "link"), result, strict=True))


def formation_from_source(source: str) -> str:
    if (
        any(has_word(source, word) for word in ("ring", "circle", "circles", "orbit", "center", "centre"))
        or has_phrase(source, ["around the light", "around the core", "go around"])
    ):
        return "ring"
    if any(has_word(source, word) for word in ("spread", "wide", "edges", "perimeter")):
        return "spread"
    if any(has_word(source, word) for word in ("link", "together", "chain", "crossing")):
        return "link"
    return "balanced"


def radius_from_source(source: str, formation: str) -> int:
    cells = re.search(r"(?:within|inside|radius(?:\s+of)?|range(?:\s+of)?)\s+(\d{1,2})\s*(?:cells?|tiles?)", source, re.IGNORECASE)
    if cells:
        return min(14, max(4, int(cells.group(1))))
    percent = re.search(r"(?:within|inside|radius(?:\s+of)?|range(?:\s+of)?)\s+(\d{1,3})\s*%", source, re.IGNORECASE)
    if percent:
        return min(14, max(4, int(int(percent.group(1)) / 100 * GRID_ROWS + 0.5)))
    return {"ring": 5, "spread": 14, "link": 8, "balanced": 9}[formation]


def interceptors_from_source(source: str) -> int:
    match = re.search(r"(?:send|use|with)?\s*(one|two|three|[1-3])\s+(?:units?|lights?|interceptors?)", source, re.IGNORECASE)
    if not match:
        match = re.search(r"(?:send|use|with)\s+(one|two|three|[1-3])(?:\b|\s)", source, re.IGNORECASE)
    if not match:
        return 3 if has_phrase(source, ["all three", "whole squad", "everyone"]) else 2
    values = {"one": 1, "two": 2, "three": 3}
    return min(3, max(1, values.get(match.group(1).lower(), int(match.group(1)) if match.group(1).isdigit() else 2)))


def pursuit_from_source(source: str) -> int:
    if has_phrase(source, ["do not chase", "don't chase", "never chase", "no chase", "without chasing", "return immediately"]):
        return 0
    # Allow an object between the verb and the distance ("chase threats for 4 cells"),
    # but never across sentence punctuation. Mirrors src/game/strategy.ts.
    explicit = re.search(r"(?:chase|pursue|pursuit)[^.;!?]*?(\d{1,2})\s*(?:cells?|tiles?)", source, re.IGNORECASE)
    if explicit:
        return min(8, max(0, int(explicit.group(1))))
    if has_phrase(source, ["short chase", "brief pursuit", "return quickly"]):
        return 2
    if any(has_word(source, word) for word in ("chase", "pursue", "hunt", "hunter")):
        return 6
    return 2


def movement_from_source(source: str) -> tuple[str, int]:
    if matches(source, "erratic"):
        return "erratic", 78
    if matches(source, "disciplined"):
        return "disciplined", 10
    if matches(source, "organic"):
        return "organic", 42
    return "organic", 34


def compile_policy(source: str) -> dict[str, object]:
    source = normalize(source)
    matched = {group: matches(source, group) for group in SIGNALS}
    flat = list(dict.fromkeys(word for group in SIGNALS for word in matched[group]))
    if not flat:
        raise ValueError("no tactical signal")
    formation = formation_from_source(source)
    movement_style, entropy = movement_from_source(source)
    threshold_match = re.search(r"(?:below|under|at)\s+(\d{1,2})\s*%", source, re.IGNORECASE)
    threshold = min(80, max(15, int(threshold_match.group(1)))) if threshold_match else 35
    return {
        "focus": allocate(len(matched["core"]), len(matched["edge"]), len(matched["link"])),
        "formation": formation,
        "engagementRadius": radius_from_source(source, formation),
        "interceptors": interceptors_from_source(source),
        "pursuitLimit": pursuit_from_source(source),
        "movementStyle": movement_style,
        "entropy": entropy,
        "risk": min(100, max(0, 50 + len(matched["aggressive"]) * 15 - len(matched["cautious"]) * 15)),
        "pulseHealthThreshold": threshold,
        "matchedSignals": flat,
    }


def pulse_guidance(health: int, threat: int, threshold: int) -> str:
    if health <= threshold or threat >= 76:
        return "FIRE"
    if threat >= 54 or health <= threshold + 15:
        return "READY"
    return "HOLD"


def exposure_damage(corruption_size: int, defenders: int, tick: int) -> int:
    if tick % 15 != 0 or corruption_size < 70 or defenders >= 2:
        return 0
    return 2 if defenders == 0 else 1


def instinct_impact(
    intercept_clears: int,
    trail_repairs: int,
    pulse_clears: int,
    manual_clears: int = 0,
) -> int:
    autonomous = max(0, intercept_clears) + max(0, trail_repairs)
    total = autonomous + max(0, pulse_clears) + max(0, manual_clears)
    return 0 if total == 0 else min(100, max(0, round(autonomous / total * 100)))


def performance_score(final_health: int, peak_threat: int, impact: int) -> int:
    threat_control = 100 - min(100, max(0, peak_threat))
    return min(100, max(0, round(
        min(100, max(0, final_health)) * 0.55
        + min(100, max(0, impact)) * 0.25
        + threat_control * 0.20
    )))


def performance_grade(outcome: str, score: int) -> str:
    if outcome == "core-lost":
        return "D"
    if score >= 85:
        return "S"
    if score >= 70:
        return "A"
    if score >= 55:
        return "B"
    if score >= 35:
        return "C"
    return "D"


def threat_urgency(core_distance: int, engagement_radius: int, sector_pressure: int) -> int:
    breach_eta = max(0, core_distance - engagement_radius)
    return min(100, max(0, 100 - 12 * breach_eta + 3 * sector_pressure))


def vectors() -> dict[str, object]:
    return {
        "contract": "gridwake-instinct-runtime-v1",
        "policies": [{"name": name, "source": source, "policy": compile_policy(source)} for name, source in EXAMPLES.items()],
        "guidance": [
            {"health": 100, "threat": 30, "threshold": 35, "result": pulse_guidance(100, 30, 35)},
            {"health": 50, "threat": 55, "threshold": 35, "result": pulse_guidance(50, 55, 35)},
            {"health": 34, "threat": 20, "threshold": 35, "result": pulse_guidance(34, 20, 35)},
            {"health": 90, "threat": 76, "threshold": 35, "result": pulse_guidance(90, 76, 35)},
        ],
        "exposure": [
            {"corruptionSize": 69, "defenders": 0, "tick": 15, "result": exposure_damage(69, 0, 15)},
            {"corruptionSize": 70, "defenders": 0, "tick": 14, "result": exposure_damage(70, 0, 14)},
            {"corruptionSize": 70, "defenders": 0, "tick": 15, "result": exposure_damage(70, 0, 15)},
            {"corruptionSize": 70, "defenders": 1, "tick": 15, "result": exposure_damage(70, 1, 15)},
            {"corruptionSize": 70, "defenders": 2, "tick": 15, "result": exposure_damage(70, 2, 15)},
        ],
        "urgency": [
            {"coreDistance": 4, "engagementRadius": 4, "sectorPressure": 0, "result": threat_urgency(4, 4, 0)},
            {"coreDistance": 7, "engagementRadius": 4, "sectorPressure": 4, "result": threat_urgency(7, 4, 4)},
            {"coreDistance": 20, "engagementRadius": 4, "sectorPressure": 0, "result": threat_urgency(20, 4, 0)},
            {"coreDistance": 5, "engagementRadius": 8, "sectorPressure": 20, "result": threat_urgency(5, 8, 20)},
        ],
        "pulse": {"clearCap": PULSE_CLEAR_CAP, "shieldTicks": PULSE_SHIELD_TICKS},
        "grades": [
            {"outcome": "grid-held", "health": 100, "peakThreat": 40, "instinctImpact": 100},
            {"outcome": "grid-held", "health": 80, "peakThreat": 40, "instinctImpact": 80},
            {"outcome": "grid-held", "health": 55, "peakThreat": 90, "instinctImpact": 30},
            {"outcome": "core-lost", "health": 0, "peakThreat": 100, "instinctImpact": 100},
        ],
    }


def with_grade_results(payload: dict[str, object]) -> dict[str, object]:
    for vector in payload["grades"]:  # type: ignore[index]
        score = performance_score(vector["health"], vector["peakThreat"], vector["instinctImpact"])
        vector["score"] = score
        vector["result"] = performance_grade(vector["outcome"], score)
    return payload


if __name__ == "__main__":
    output = Path(__file__).with_name("causal_strategy_golden.json")
    output.write_text(json.dumps(with_grade_results(vectors()), indent=2) + "\n", encoding="utf-8")
    print(output)
