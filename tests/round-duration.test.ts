import { describe, expect, it } from "vitest";
import {
  ROUND_SECONDS,
  ROUND_TICKS,
  TICK_RATE,
} from "../src/game/types";

describe("round duration source of truth", () => {
  it("derives round ticks from the displayed duration", () => {
    expect(ROUND_SECONDS).toBe(45);
    expect(ROUND_TICKS).toBe(ROUND_SECONDS * TICK_RATE);
  });
});
