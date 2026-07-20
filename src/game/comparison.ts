import type { RoundReceipt } from "./types";

export type ReceiptDelta = Readonly<{
  key: "score" | "core" | "instinct";
  label: "SCORE" | "CORE" | "INSTINCT";
  value: number;
}>;

export function compareReceipts(
  current: RoundReceipt,
  previous: RoundReceipt,
): readonly ReceiptDelta[] {
  if (current.seed !== previous.seed) return [];
  if (current.engineVersion !== previous.engineVersion) return [];

  return [
    {
      key: "score",
      label: "SCORE",
      value: current.gradeScore - previous.gradeScore,
    },
    {
      key: "core",
      label: "CORE",
      value: current.finalHealth - previous.finalHealth,
    },
    {
      key: "instinct",
      label: "INSTINCT",
      value: current.instinctImpact - previous.instinctImpact,
    },
  ];
}

export function formatSignedDelta(value: number): string {
  if (value === 0) return "±00";
  const magnitude = Math.abs(value).toString().padStart(2, "0");
  return `${value > 0 ? "+" : "−"}${magnitude}`;
}

export function deltaTone(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function formatReceiptShareText(receipt: RoundReceipt): string {
  return [
    "GRIDWAKE",
    `${receipt.grade} ${receipt.gradeScore}/100`,
    `CORE ${receipt.finalHealth}`,
    `INSTINCT ${receipt.instinctImpact}`,
    `I${receipt.interceptClears} R${receipt.trailRepairs} P${receipt.pulseClears}`,
    `SEED ${receipt.seed}`,
    `REPLAY ${receipt.replayHash}`,
  ].join(" · ");
}
