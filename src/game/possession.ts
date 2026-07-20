/** Solo-only possession policy. Multiplayer has no host-ordered move channel yet. */
export function allowPossessionForMode(mode: "solo" | "multiplayer"): boolean {
  return mode === "solo";
}
