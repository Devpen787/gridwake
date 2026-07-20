import { describe, expect, it } from "vitest";
import {
  markControlsHintSeen,
  shouldShowControlsHint,
} from "../src/components/ControlsHint";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("controls hint session helpers", () => {
  it("shows until marked seen", () => {
    const storage = memoryStorage();
    expect(shouldShowControlsHint(storage)).toBe(true);
    markControlsHintSeen(storage);
    expect(shouldShowControlsHint(storage)).toBe(false);
  });
});
