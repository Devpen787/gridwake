type CoreMarkProps = Readonly<{
  size?: "small" | "medium" | "large";
  active?: boolean;
}>;

export function CoreMark({ size = "medium", active = true }: CoreMarkProps) {
  return (
    <div className={`core-mark core-mark--${size} ${active ? "core-mark--active" : ""}`} aria-hidden="true">
      <span className="core-mark__halo" />
      <span className="core-mark__diamond core-mark__diamond--outer" />
      <span className="core-mark__diamond core-mark__diamond--inner" />
      <span className="core-mark__point" />
    </div>
  );
}

