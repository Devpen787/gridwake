"""Independent integer reference for GRIDWAKE Instinct Runtime v2.

Cross-language parity for bounded policy dials derived from the canonical plan
adapter. Guidance, exposure, urgency, and grade formulas remain shared with the
TypeScript engine. This does not prove browser cheat resistance or model NLP.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


GRID_ROWS = 18
PULSE_CLEAR_CAP = 6
PULSE_SHIELD_TICKS = 12

EXAMPLES = {
    "ring": "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.",
    "edge": "Spread wide, scout the weakest edges aggressively with all three units, and move unpredictably.",
    "link": "Link together organically, reinforce every ally trail, and send one unit to nearby threats before returning.",
    "ten_percent_ring": "Go in circles around the light and only attack anything within 10%; send two and do not chase.",
}

# Inspected against src/game/instinct policyAdapter + compiler (local-instinct-v2).
# Intentional v1→v2 deltas:
# - focus comes from directive/target weights, not keyword hit counts
# - matchedSignals are directive tokens, not surface keywords
# - aggressive with no explicit leash → pursuitLimit 6 (was 2)
# - organic entropy default 42 (was 34 when organic words absent)
# - "tight" no longer lowers risk; only cautious/aggressive engagement words do
V2_EXAMPLE_POLICIES = {
    "ring": {
        "focus": {"core": 41, "edge": 34, "link": 25},
        "formation": "ring",
        "engagementRadius": 5,
        "interceptors": 2,
        "pursuitLimit": 0,
        "movementStyle": "disciplined",
        "entropy": 10,
        "risk": 50,
        "pulseHealthThreshold": 45,
        "matchedSignals": ["screen", "core", "guardian", "intercept", "nearest-breach", "scout"],
    },
    "edge": {
        "focus": {"core": 28, "edge": 44, "link": 28},
        "formation": "spread",
        "engagementRadius": 14,
        "interceptors": 3,
        "pursuitLimit": 6,
        "movementStyle": "erratic",
        "entropy": 78,
        "risk": 65,
        "pulseHealthThreshold": 35,
        "matchedSignals": ["intercept", "highest-pressure-sector", "squad"],
    },
    "link": {
        "focus": {"core": 28, "edge": 28, "link": 44},
        "formation": "link",
        "engagementRadius": 8,
        "interceptors": 1,
        "pursuitLimit": 2,
        "movementStyle": "organic",
        "entropy": 42,
        "risk": 50,
        "pulseHealthThreshold": 35,
        "matchedSignals": ["repair", "shared-trail", "mender"],
    },
    "ten_percent_ring": {
        "focus": {"core": 41, "edge": 34, "link": 25},
        "formation": "ring",
        "engagementRadius": 4,
        "interceptors": 2,
        "pursuitLimit": 0,
        "movementStyle": "organic",
        "entropy": 42,
        "risk": 50,
        "pulseHealthThreshold": 35,
        "matchedSignals": ["orbit", "core", "guardian", "intercept", "nearest-breach", "scout"],
    },
}


def normalize(source: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", source)).strip()[:280]


def compile_policy(source: str) -> dict[str, object]:
    source = normalize(source)
    for name, example in EXAMPLES.items():
        if normalize(example) == source:
            return dict(V2_EXAMPLE_POLICIES[name])
    raise ValueError(f"no v2 golden policy for source: {source!r}")


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
        "contract": "gridwake-instinct-runtime-v2",
        "policies": [
            {"name": name, "source": source, "policy": compile_policy(source)}
            for name, source in EXAMPLES.items()
        ],
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
