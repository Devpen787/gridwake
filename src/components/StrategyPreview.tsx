import { useMemo } from "react";
import { createInitialState, formationAnchor } from "../game/engine";
import { CORE_X, CORE_Y, GRID_COLUMNS, GRID_ROWS, type CompiledStrategy, type Point } from "../game/types";

type StrategyPreviewProps = Readonly<{
  strategy: CompiledStrategy | null;
}>;

const CELL = 10;
const PAD = 14;
const WIDTH = GRID_COLUMNS * CELL + PAD * 2;
const HEIGHT = GRID_ROWS * CELL + PAD * 2;

function cellCenter(point: Point): Readonly<{ x: number; y: number }> {
  return {
    x: PAD + point.x * CELL + CELL / 2,
    y: PAD + point.y * CELL + CELL / 2,
  };
}

function RoleGlyph({
  point,
  color,
  shape,
  interceptor,
}: Readonly<{
  point: Point;
  color: string;
  shape: "diamond" | "circle" | "triangle";
  interceptor: boolean;
}>) {
  const { x, y } = cellCenter(point);
  const r = CELL * 0.42;
  return (
    <g>
      {interceptor ? (
        <circle cx={x} cy={y} r={r * 1.85} fill="none" stroke="#40e8ff" strokeWidth={1.2} opacity={0.85} />
      ) : null}
      {shape === "circle" ? (
        <>
          <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.6} />
          <circle cx={x} cy={y} r={r * 0.35} fill={color} />
        </>
      ) : null}
      {shape === "triangle" ? (
        <polygon
          points={`${x},${y - r} ${x + r},${y + r * 0.75} ${x - r},${y + r * 0.75}`}
          fill={`${color}22`}
          stroke={color}
          strokeWidth={1.6}
        />
      ) : null}
      {shape === "diamond" ? (
        <polygon
          points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
          fill={`${color}22`}
          stroke={color}
          strokeWidth={1.6}
        />
      ) : null}
    </g>
  );
}

export function StrategyPreview({ strategy }: StrategyPreviewProps) {
  const preview = useMemo(() => {
    if (!strategy) return null;
    const state = createInitialState(1, strategy, 1);
    const anchors = state.lights.map((_, index) => formationAnchor(state, index));
    return { state, anchors, policy: strategy.policy };
  }, [strategy]);

  if (!preview) {
    return (
      <div className="strategy-preview strategy-preview--empty" aria-hidden="true">
        <span>INSTINCT REQUIRED</span>
      </div>
    );
  }

  const { state, anchors, policy } = preview;
  const core = cellCenter({ x: CORE_X, y: CORE_Y });
  const engageR = Math.max(2, policy.engagementRadius) * CELL;
  const leashR = (policy.engagementRadius + policy.pursuitLimit) * CELL;
  const movementDash = policy.movementStyle === "erratic"
    ? "2 3"
    : policy.movementStyle === "organic"
      ? "4 3"
      : undefined;

  return (
    <figure className="strategy-preview" aria-label="Compiled Instinct preview">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`${policy.formation} formation, protect ${policy.engagementRadius}, ${policy.interceptors} interceptors, ${policy.movementStyle} movement`}
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#03060a" />
        {Array.from({ length: GRID_COLUMNS + 1 }, (_, x) => (
          <line
            key={`vx-${x}`}
            x1={PAD + x * CELL}
            y1={PAD}
            x2={PAD + x * CELL}
            y2={PAD + GRID_ROWS * CELL}
            stroke="#183344"
            strokeWidth={x % 5 === 0 ? 0.9 : 0.45}
            opacity={x % 5 === 0 ? 0.55 : 0.28}
          />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }, (_, y) => (
          <line
            key={`hy-${y}`}
            x1={PAD}
            y1={PAD + y * CELL}
            x2={PAD + GRID_COLUMNS * CELL}
            y2={PAD + y * CELL}
            stroke="#183344"
            strokeWidth={y % 3 === 0 ? 0.9 : 0.45}
            opacity={y % 3 === 0 ? 0.55 : 0.28}
          />
        ))}

        <circle
          cx={core.x}
          cy={core.y}
          r={leashR}
          fill="none"
          stroke="#ff4d6d"
          strokeWidth={1}
          opacity={policy.pursuitLimit > 0 ? 0.35 : 0.12}
          strokeDasharray="3 4"
        />
        <circle
          cx={core.x}
          cy={core.y}
          r={engageR}
          fill="none"
          stroke="#40e8ff"
          strokeWidth={1.2}
          opacity={0.55}
          strokeDasharray={movementDash}
        />

        {anchors.map((anchor, index) => {
          const point = cellCenter(anchor);
          return (
            <rect
              key={`anchor-${index}`}
              x={point.x - CELL * 0.35}
              y={point.y - CELL * 0.35}
              width={CELL * 0.7}
              height={CELL * 0.7}
              fill="none"
              stroke="#a78bfa"
              strokeWidth={1}
              opacity={0.55}
            />
          );
        })}

        <polygon
          points={`${core.x},${core.y - 5} ${core.x + 5},${core.y} ${core.x},${core.y + 5} ${core.x - 5},${core.y}`}
          fill="none"
          stroke="#f4f7ff"
          strokeWidth={1.4}
        />

        {state.lights.map((light, index) => (
          <RoleGlyph
            key={light.id}
            point={{ x: light.x, y: light.y }}
            color={`#${light.color.toString(16).padStart(6, "0")}`}
            shape={light.shape}
            interceptor={index < policy.interceptors}
          />
        ))}
      </svg>
      <figcaption>
        <span>{policy.formation.toUpperCase()}</span>
        <span>R{policy.engagementRadius}</span>
        <span>{policy.interceptors} INT</span>
        <span>{policy.pursuitLimit === 0 ? "NO CHASE" : `+${policy.pursuitLimit}`}</span>
        <span>{policy.movementStyle.toUpperCase()}</span>
      </figcaption>
    </figure>
  );
}
