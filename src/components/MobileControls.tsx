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

export function MobileControls({
  lights,
  possessedLightId,
  disabled,
  onPossess,
  onMove,
}: MobileControlsProps) {
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
            onClick={() => onMove(intent)}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
