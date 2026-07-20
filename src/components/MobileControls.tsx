import { useEffect, useRef } from "react";
import type { LightState, ManualIntent } from "../game/types";

type MobileControlsProps = Readonly<{
  lights: readonly LightState[];
  possessedLightId: string | null;
  disabled: boolean;
  onPossess: (lightId: string | null) => void;
  onMove: (intent: ManualIntent) => void;
}>;

const DIRECTIONS: readonly Readonly<{
  label: string;
  symbol: string;
  intent: ManualIntent;
  className: string;
}>[] = [
  { label: "Move up", symbol: "↑", intent: { dx: 0, dy: -1 }, className: "mobile-step--up" },
  { label: "Move left", symbol: "←", intent: { dx: -1, dy: 0 }, className: "mobile-step--left" },
  { label: "Move right", symbol: "→", intent: { dx: 1, dy: 0 }, className: "mobile-step--right" },
  { label: "Move down", symbol: "↓", intent: { dx: 0, dy: 1 }, className: "mobile-step--down" },
];

const HOLD_DELAY_MS = 220;
const HOLD_REPEAT_MS = 160;

export function MobileControls({
  lights,
  possessedLightId,
  disabled,
  onPossess,
  onMove,
}: MobileControlsProps) {
  const holdTimerRef = useRef<number | null>(null);
  const repeatTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (repeatTimerRef.current !== null) window.clearInterval(repeatTimerRef.current);
  }, []);

  const clearHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (repeatTimerRef.current !== null) {
      window.clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  };

  const beginHold = (intent: ManualIntent) => {
    if (disabled || possessedLightId === null) return;
    onMove(intent);
    clearHold();
    holdTimerRef.current = window.setTimeout(() => {
      repeatTimerRef.current = window.setInterval(() => onMove(intent), HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  return (
    <div className="mobile-controls" aria-label="Touch possession controls">
      <div className="mobile-light-select" role="group" aria-label="Select a light">
        {lights.map((light, index) => {
          const selected = light.id === possessedLightId;
          return (
            <button
              key={light.id}
              type="button"
              disabled={disabled}
              aria-label={`${selected ? "Release" : "Possess"} light ${index + 1}, ${light.role}`}
              aria-pressed={selected}
              onClick={() => onPossess(selected ? null : light.id)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mobile-step-pad" role="group" aria-label="Move possessed light">
        {DIRECTIONS.map(({ label, symbol, intent, className }) => (
          <button
            key={label}
            className={className}
            type="button"
            disabled={disabled || possessedLightId === null}
            aria-label={label}
            onPointerDown={(event) => {
              event.preventDefault();
              beginHold(intent);
            }}
            onPointerUp={clearHold}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
