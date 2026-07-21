import { ACTOR_PHRASES, CONNECTORS, NEGATION_PHRASES } from "./lexicon";
import type { Clause, NormalizedText, StrategyActor } from "./types";

function hasNegation(text: string): boolean {
  const lowered = text.toLowerCase();
  return NEGATION_PHRASES.some((phrase) => {
    const at = lowered.indexOf(phrase);
    if (at < 0) return false;
    const before = at === 0 ? " " : lowered[at - 1]!;
    return !/[a-z0-9]/i.test(before);
  });
}

function detectActor(text: string): StrategyActor | null {
  const lowered = text.toLowerCase().trim();
  for (const entry of ACTOR_PHRASES) {
    if (lowered.includes(entry.phrase)) return entry.actor;
  }
  // Clause-leading role noun: "Scout hunts..." / "Scout," — not "scout the edges"
  const leading = lowered.match(/^(guardian|scout|mender)\b/);
  if (leading) {
    const rest = lowered.slice(leading[0]!.length).trimStart();
    if (!rest.startsWith("the ") && !rest.startsWith("a ")) return leading[1] as StrategyActor;
  }
  return null;
}

/** Connectors that must stay attached to the following clause (conditions / sequencing). */
const KEEP_WITH_NEXT = new Set(["when", "if", "during", "after", "until", "unless", "then", "but"]);

export function segmentClauses(normalized: NormalizedText): Clause[] {
  const source = normalized.text;
  if (!source) return [];

  const parts: string[] = [];
  let last = 0;
  const re = new RegExp(`([.!?;]+|\\b(?:${CONNECTORS.join("|")})\\b)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const token = match[0]!;
    if (/^[.!?;]+$/.test(token)) {
      const chunk = source.slice(last, match.index).trim();
      if (chunk) parts.push(chunk);
      last = match.index + token.length;
      continue;
    }
    const connector = token.toLowerCase();
    if (KEEP_WITH_NEXT.has(connector)) {
      const before = source.slice(last, match.index).trim();
      if (before) parts.push(before);
      // Keep connector with the remainder until next hard split — handled by resetting last to connector start.
      last = match.index;
      continue;
    }
    const chunk = source.slice(last, match.index).trim();
    if (chunk) parts.push(chunk);
    last = match.index + token.length;
  }
  const tail = source.slice(last).trim();
  if (tail) parts.push(tail);

  // Merge tiny connector-leading fragments that are only the connector word.
  const merged: string[] = [];
  for (const part of parts) {
    const lowered = part.toLowerCase();
    const onlyConnector = CONNECTORS.some((connector) => lowered === connector);
    if (onlyConnector && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`;
      continue;
    }
    // Attach condition / sequencing tails to the prior action clause — but a
    // fronted condition with its own body ("During surge, send two units…")
    // is a standalone clause, not a tail of the previous one.
    const frontedCondition = /^(?:when|if|during|after|until|unless)\b[^,.]*,\s*\S/.test(lowered);
    if (
      merged.length > 0
      && !frontedCondition
      && /^(?:when|if|during|after|until|unless|then)\b/.test(lowered)
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`;
      continue;
    }
    merged.push(part);
  }

  const clauses: Clause[] = [];
  let searchFrom = 0;
  let previousActor: StrategyActor | null = null;

  for (const part of merged) {
    const at = source.toLowerCase().indexOf(part.toLowerCase(), searchFrom);
    const start = at >= 0 ? at : searchFrom;
    const end = start + part.length;
    searchFrom = end;
    const explicit = detectActor(part);
    const actor = explicit ?? previousActor;
    if (explicit) previousActor = explicit;
    clauses.push({
      text: part,
      start,
      end,
      actor,
      negated: hasNegation(part),
    });
  }

  return clauses;
}
