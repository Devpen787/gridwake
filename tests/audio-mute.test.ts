import { describe, expect, it } from "vitest";
import {
  readMutedPreference,
  writeMutedPreference,
} from "../src/audio/audioDirector";

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

describe("audio mute preference helpers", () => {
  it("defaults unmuted and persists mute choice", () => {
    const storage = memoryStorage();
    expect(readMutedPreference(storage)).toBe(false);
    writeMutedPreference(true, storage);
    expect(readMutedPreference(storage)).toBe(true);
    writeMutedPreference(false, storage);
    expect(readMutedPreference(storage)).toBe(false);
  });
});
