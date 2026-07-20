import { useEffect, useState } from "react";
import type { GameEvent } from "../game/types";

type EventToastProps = Readonly<{
  event: GameEvent | null;
  durationMs?: number;
}>;

export function EventToast({ event, durationMs = 1_250 }: EventToastProps) {
  const [visible, setVisible] = useState<GameEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    setVisible(event);
    const timeout = window.setTimeout(() => {
      setVisible((current) => (current?.tick === event.tick ? null : current));
    }, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, event]);

  if (!visible) return null;

  return (
    <div
      key={`${visible.tick}-${visible.kind}`}
      className={`event-toast event-toast--${visible.kind}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{visible.kind.toUpperCase()}</span>
      <strong>{visible.message}</strong>
    </div>
  );
}
