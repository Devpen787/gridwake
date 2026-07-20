import { useMemo } from "react";
import { createInitialState, formationAnchor, pressureBySector, worstSector } from "../game/engine";
import { sectorCenter } from "../game/math";
import {
  CORE_X,
  CORE_Y,
  GRID_COLUMNS,
  GRID_ROWS,
  type CompiledStrategy,
  type Point,
} from "../game/types";
import type { CanonicalDirective, StrategyInterpretation } from "../game/instinct/types";

type StrategyPreviewProps = Readonly<{
  strategy: CompiledStrategy | null;
  interpretation?: StrategyInterpretation | null;
  previewSeed?: number;
}>;

const PREVIEW_SEED = 1;
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
  role,
}: Readonly<{
  point: Point;
  color: string;
  shape: "diamond" | "circle" | "triangle";
  interceptor: boolean;
  role: "guardian" | "scout" | "mender";
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
      <title>{role.toUpperCase()}</title>
    </g>
  );
}

function phaseLabel(directive: CanonicalDirective): string | null {
  if (directive.condition.kind !== "phase") return null;
  return directive.condition.phase.toUpperCase();
}

function formatTarget(target: CanonicalDirective["target"]): string {
  return target.replace(/-/g, " ");
}

function formatContinuation(continuation: CanonicalDirective["continuation"]): string {
  if (continuation === "return") return "RETURN";
  if (continuation === "hold") return "HOLD";
  return "CONTINUE";
}

export function StrategyPreview({
  strategy,
  interpretation = null,
  previewSeed = PREVIEW_SEED,
}: StrategyPreviewProps) {
  const preview = useMemo(() => {
    if (!strategy) return null;
    const state = createInitialState(previewSeed, strategy, 1);
    const anchors = state.lights.map((_, index) => formationAnchor(state, index));
    const pressure = pressureBySector(state.corruption);
    const scoutSector = worstSector(state.corruption);
    const scoutCenter = sectorCenter(scoutSector);
    const sampleThreats = [...state.corruption]
      .slice(0, 14)
      .map((key) => {
        const [x, y] = key.split(":").map(Number);
        return { x, y };
      });
    const plan = interpretation?.plan ?? strategy.plan ?? null;
    const phaseDirectives = plan?.directives.filter((directive) => directive.condition.kind === "phase") ?? [];
    const scoutDirectives = plan?.directives.filter(
      (directive) => directive.actor === "scout" || directive.actor === "squad",
    ) ?? [];
    const menderDirectives = plan?.directives.filter(
      (directive) => directive.actor === "mender" || directive.action === "repair",
    ) ?? [];
    const guardianLight = state.lights.find((light) => light.role === "guardian") ?? state.lights[0];
    const scoutLight = state.lights.find((light) => light.role === "scout") ?? state.lights[1];
    const menderLight = state.lights.find((light) => light.role === "mender") ?? state.lights[2];
    const menderTrailTarget = menderDirectives.length > 0
      ? cellCenter(sectorCenter(scoutSector))
      : cellCenter({ x: scoutLight.x, y: scoutLight.y });
    return {
      state,
      anchors,
      policy: strategy.policy,
      pressure,
      scoutSector,
      scoutCenter,
      sampleThreats,
      phaseDirectives,
      scoutDirectives,
      guardianLight,
      scoutLight,
      menderLight,
      menderTrailTarget,
      pulseThreshold: strategy.policy.pulseHealthThreshold,
      plan,
    };
  }, [strategy, interpretation, previewSeed]);

  if (!preview) {
    return (
      <div className="strategy-preview strategy-preview--empty" aria-hidden="true">
        <span>INSTINCT REQUIRED</span>
      </div>
    );
  }

  const {
    state,
    anchors,
    policy,
    pressure,
    scoutSector,
    scoutCenter,
    sampleThreats,
    phaseDirectives,
    scoutDirectives,
    guardianLight,
    scoutLight,
    menderLight,
    menderTrailTarget,
    pulseThreshold,
    plan,
  } = preview;

  const core = cellCenter({ x: CORE_X, y: CORE_Y });
  const engageR = Math.max(2, policy.engagementRadius) * CELL;
  const leashR = (policy.engagementRadius + policy.pursuitLimit) * CELL;
  const movementDash = policy.movementStyle === "erratic"
    ? "2 3"
    : policy.movementStyle === "organic"
      ? "4 3"
      : undefined;
  const scoutReticle = cellCenter(scoutCenter);
  const guardianCenter = cellCenter({ x: guardianLight.x, y: guardianLight.y });
  const menderCenter = cellCenter({ x: menderLight.x, y: menderLight.y });
  const pulseMarkerY = core.y + 18 - (pulseThreshold / 100) * 36;

  const responderCount = scoutDirectives.find((directive) => directive.responderCount !== null)?.responderCount
    ?? policy.interceptors;
  const primaryScout = scoutDirectives[0];
  const leashLabel = policy.pursuitLimit === 0 ? "NO CHASE" : `LEASH +${policy.pursuitLimit}`;

  return (
    <figure className="strategy-preview strategy-preview--lab" aria-label="Compiled Instinct preview">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`${policy.formation} formation preview with sample threats`}
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

        {pressure.map((value, sector) => {
          if (value === 0) return null;
          const center = cellCenter(sectorCenter(sector));
          return (
            <circle
              key={`pressure-${sector}`}
              cx={center.x}
              cy={center.y}
              r={CELL * (0.35 + value * 0.08)}
              fill={sector === scoutSector ? "rgba(64,232,255,0.12)" : "rgba(255,77,109,0.08)"}
              stroke={sector === scoutSector ? "#40e8ff" : "#ff4d6d"}
              strokeWidth={sector === scoutSector ? 1.2 : 0.6}
              opacity={0.75}
            />
          );
        })}

        {sampleThreats.map((point, index) => {
          const center = cellCenter(point);
          return (
            <rect
              key={`threat-${index}`}
              x={center.x - CELL * 0.22}
              y={center.y - CELL * 0.22}
              width={CELL * 0.44}
              height={CELL * 0.44}
              fill="#ff4d6d"
              opacity={0.55}
            />
          );
        })}

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

        <circle
          cx={guardianCenter.x}
          cy={guardianCenter.y}
          r={CELL * 1.1}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth={0.9}
          opacity={0.45}
          strokeDasharray="2 3"
        />

        <line
          x1={menderCenter.x}
          y1={menderCenter.y}
          x2={menderTrailTarget.x}
          y2={menderTrailTarget.y}
          stroke="#34d399"
          strokeWidth={1}
          opacity={0.55}
          strokeDasharray="4 3"
        />

        <g opacity={0.9}>
          <line x1={scoutReticle.x - 7} y1={scoutReticle.y} x2={scoutReticle.x + 7} y2={scoutReticle.y} stroke="#40e8ff" strokeWidth={1.2} />
          <line x1={scoutReticle.x} y1={scoutReticle.y - 7} x2={scoutReticle.x} y2={scoutReticle.y + 7} stroke="#40e8ff" strokeWidth={1.2} />
          <circle cx={scoutReticle.x} cy={scoutReticle.y} r={9} fill="none" stroke="#40e8ff" strokeWidth={0.8} opacity={0.7} />
          <text x={scoutReticle.x + 10} y={scoutReticle.y - 8} fill="#40e8ff" fontSize="5.5" letterSpacing="0.8">S{scoutSector + 1}</text>
        </g>

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
              stroke="#3d5a6a"
              strokeWidth={1}
              opacity={0.55}
            />
          );
        })}

        <g aria-hidden="true">
          <rect x={core.x - 3} y={core.y - 18} width={6} height={36} fill="rgba(3,6,10,0.8)" stroke="#1f3340" strokeWidth={0.6} />
          <line x1={core.x - 5} y1={pulseMarkerY} x2={core.x + 5} y2={pulseMarkerY} stroke="#ffd166" strokeWidth={1.4} />
          <text x={core.x + 8} y={pulseMarkerY + 2} fill="#ffd166" fontSize="5.5">PULSE {pulseThreshold}%</text>
        </g>

        {phaseDirectives.map((directive, index) => {
          const label = phaseLabel(directive);
          if (!label) return null;
          const y = core.y - 24 - index * 10;
          return (
            <g key={`phase-${index}`} opacity={0.65}>
              <rect x={core.x - 26} y={y - 6} width={52} height={8} fill="rgba(3,6,10,0.85)" stroke="#607080" strokeWidth={0.6} strokeDasharray="2 2" />
              <text x={core.x} y={y} textAnchor="middle" fill="#8fa0ab" fontSize="5">{label} · DORMANT</text>
            </g>
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
            interceptor={index < responderCount}
            role={light.role}
          />
        ))}
      </svg>
      <figcaption>
        <span>{policy.formation.toUpperCase()}</span>
        <span>R{policy.engagementRadius}</span>
        <span>{responderCount} RESP</span>
        <span>{leashLabel}</span>
        <span>{formatContinuation(primaryScout?.continuation ?? "return")}</span>
        <span>{policy.movementStyle.toUpperCase()}</span>
        {primaryScout ? <span>{formatTarget(primaryScout.target)}</span> : null}
        {plan ? <span>P{plan.directives.length} DIRECTIVES</span> : null}
      </figcaption>
    </figure>
  );
}
