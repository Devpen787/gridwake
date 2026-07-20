import { SPELLING_FIXES } from "./lexicon";
import type { NormalizedText, SourceSpan } from "./types";

const MAX_LENGTH = 280;

export function normalizeInstinctSource(source: string): NormalizedText {
  const nfkc = source.normalize("NFKC");
  const chars: string[] = [];
  const indexMap: number[] = [];
  let previousSpace = false;

  for (let index = 0; index < nfkc.length; index += 1) {
    let char = nfkc[index]!;
    if (char === "’" || char === "`") char = "'";
    if (char === "–" || char === "—") char = "-";
    if (/\s/.test(char)) {
      if (previousSpace || chars.length === 0) continue;
      chars.push(" ");
      indexMap.push(index);
      previousSpace = true;
      continue;
    }
    previousSpace = false;
    chars.push(char);
    indexMap.push(index);
  }

  while (chars.length > 0 && chars[chars.length - 1] === " ") {
    chars.pop();
    indexMap.pop();
  }

  let text = chars.join("").slice(0, MAX_LENGTH);
  const map = indexMap.slice(0, text.length);

  // Apply known spelling fixes on the normalized text while preserving spans loosely.
  for (const [wrong, right] of Object.entries(SPELLING_FIXES)) {
    const pattern = new RegExp(`(?:^|[^a-z])(${wrong})(?:$|[^a-z])`, "gi");
    text = text.replace(pattern, (full, _word, offset) => {
      const prefix = full.startsWith(wrong[0]!.toUpperCase()) || /[^a-z]/i.test(full[0]!) ? full[0]! : "";
      const start = prefix && !/^[a-z]/i.test(prefix) ? 1 : 0;
      return full.slice(0, start) + right + full.slice(start + wrong.length);
    });
  }

  // Rebuild map length if spelling changed length (best-effort: clamp).
  const finalMap = map.length >= text.length
    ? map.slice(0, text.length)
    : [...map, ...Array.from({ length: text.length - map.length }, () => map[map.length - 1] ?? 0)];

  return { text, indexMap: finalMap };
}

export function spanFromNormalized(
  normalized: NormalizedText,
  start: number,
  end: number,
): SourceSpan {
  const safeStart = Math.max(0, Math.min(start, normalized.text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, normalized.text.length));
  return {
    start: normalized.indexMap[safeStart] ?? safeStart,
    end: normalized.indexMap[Math.max(safeStart, safeEnd - 1)] ?? safeEnd,
    text: normalized.text.slice(safeStart, safeEnd),
  };
}

export function findPhraseSpans(
  normalized: NormalizedText,
  phrase: string,
  options: Readonly<{ allowVerbSuffix?: boolean }> = {},
): SourceSpan[] {
  const hay = normalized.text.toLowerCase();
  const needle = phrase.toLowerCase();
  const spans: SourceSpan[] = [];
  let from = 0;
  while (from < hay.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) break;
    const before = at === 0 ? " " : hay[at - 1]!;
    const afterIndex = at + needle.length;
    const verbSuffix = options.allowVerbSuffix
      ? hay.slice(afterIndex).match(/^(?:s|es|ed|ing)(?![a-z0-9])/)
      : null;
    const end = afterIndex + (verbSuffix ? verbSuffix[0]!.length : 0);
    const endChar = end >= hay.length ? " " : hay[end]!;
    if (/[a-z0-9]/i.test(before) || /[a-z0-9]/i.test(endChar)) {
      from = at + 1;
      continue;
    }
    if (verbSuffix && needle.includes(" ")) {
      from = at + 1;
      continue;
    }
    spans.push(spanFromNormalized(normalized, at, end));
    from = end;
  }
  return spans;
}
