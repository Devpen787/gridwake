const CONTROLS_HINT_KEY = "gridwake.controls-seen.v1";

export function shouldShowControlsHint(storage?: Storage | null): boolean {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.sessionStorage);
    return target?.getItem(CONTROLS_HINT_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markControlsHintSeen(storage?: Storage | null): void {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.sessionStorage);
    target?.setItem(CONTROLS_HINT_KEY, "1");
  } catch {
    // Session storage may be unavailable; dismissing still works in component state.
  }
}

type ControlsHintProps = Readonly<{
  visible: boolean;
  allowPossess: boolean;
  onDismiss: () => void;
}>;

export function ControlsHint({ visible, allowPossess, onDismiss }: ControlsHintProps) {
  if (!visible) return null;

  return (
    <aside className="controls-hint" aria-label="Game controls">
      <div>
        <span>CONTROLS</span>
        <strong>
          {allowPossess
            ? "1–3 POSSESS · WASD MOVE · ESC RELEASE · SPACE PULSE"
            : "SPACE PULSE"}
        </strong>
      </div>
      <button type="button" aria-label="Dismiss controls hint" onClick={onDismiss}>
        ×
      </button>
    </aside>
  );
}
