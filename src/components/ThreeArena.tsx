import { useEffect, useRef, useState } from "react";
import type { EngineState } from "../game/types";
import { LiveArenaScene, type LiveArenaPerf } from "../render/live3d/LiveArenaScene";
import { fetchDioramaManifest } from "../render/diorama/manifest";
import { PixiArena } from "./PixiArena";

type ThreeArenaProps = Readonly<{ state: EngineState }>;
type ThreeArenaStatus = "loading" | "forged" | "procedural" | "failed";

function wantsPerfOverlay(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("perf") === "1";
}

export default function ThreeArena({ state }: ThreeArenaProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const perfRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ThreeArenaStatus>("loading");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let scene: LiveArenaScene | null = null;
    let frame = 0;
    let cancelled = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const showPerf = wantsPerfOverlay();

    try {
      scene = new LiveArenaScene(canvas);
    } catch (error) {
      console.warn("[ThreeArena] WebGL scene unavailable; using the Pixi fallback", error);
      setStatus("failed");
      return;
    }

    const activeScene = scene;
    const resizeObserver = new ResizeObserver(([entry]) => {
      activeScene.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(host);
    const initial = host.getBoundingClientRect();
    activeScene.resize(initial.width, initial.height);

    if (showPerf) {
      const overlay = document.createElement("div");
      overlay.className = "arena-perf";
      overlay.setAttribute("aria-hidden", "true");
      host.appendChild(overlay);
      perfRef.current = overlay;
    }

    const render = (nowMs: number) => {
      const stats: LiveArenaPerf = activeScene.render(stateRef.current, nowMs, reducedMotion.matches);
      if (perfRef.current) {
        perfRef.current.textContent = `3D · ${stats.mode.toUpperCase()} · FPS ${stats.fps} · OBJECTS ${stats.meshes}`;
      }
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    void fetchDioramaManifest().then(async (manifest) => {
      if (cancelled || !manifest) {
        if (!cancelled) setStatus("procedural");
        return;
      }
      const loaded = await activeScene.applyManifest(manifest);
      if (!cancelled) setStatus(loaded > 0 ? "forged" : "procedural");
    });

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (!cancelled) setStatus("failed");
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      perfRef.current?.remove();
      perfRef.current = null;
      activeScene.destroy();
      scene = null;
    };
  }, [state.seed]);

  if (status === "failed") return <PixiArena state={state} />;

  return (
    <div className={`three-arena three-arena--${status}`} ref={hostRef}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="three-arena__truth" aria-hidden="true">
        {status === "forged" ? "LIVE DEPTH · FORGED SQUAD" : status === "procedural" ? "LIVE DEPTH · FALLBACK" : "LIVE DEPTH · SYNCING"}
      </span>
    </div>
  );
}
