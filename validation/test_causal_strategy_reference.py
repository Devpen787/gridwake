import json
import unittest
from pathlib import Path

from causal_strategy_reference import (
    allocate,
    compile_policy,
    exposure_damage,
    performance_grade,
    pulse_guidance,
    vectors,
    with_grade_results,
)


class CausalStrategyReferenceTests(unittest.TestCase):
    def test_focus_is_bounded_and_conserves_one_hundred(self):
        for core in range(9):
            for edge in range(9):
                for link in range(9):
                    focus = allocate(core, edge, link)
                    self.assertEqual(sum(focus.values()), 100)
                    self.assertTrue(all(0 <= value <= 100 for value in focus.values()))

    def test_non_tactical_prose_is_rejected(self):
        with self.assertRaises(ValueError):
            compile_policy("make something beautiful and surprising")

    def test_guidance_and_grade_boundaries(self):
        self.assertEqual(pulse_guidance(35, 0, 35), "FIRE")
        self.assertEqual(pulse_guidance(100, 76, 35), "FIRE")
        self.assertEqual(performance_grade("core-lost", 100), "D")
        self.assertEqual(performance_grade("grid-held", 85), "S")
        self.assertEqual(performance_grade("grid-held", 34), "D")
        self.assertEqual(exposure_damage(70, 0, 15), 2)
        self.assertEqual(exposure_damage(70, 2, 15), 0)

    def test_checked_in_vectors_match_reference(self):
        checked_in = json.loads(Path(__file__).with_name("causal_strategy_golden.json").read_text(encoding="utf-8"))
        self.assertEqual(checked_in, with_grade_results(vectors()))


if __name__ == "__main__":
    unittest.main()
