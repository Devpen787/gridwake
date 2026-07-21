import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import type { EngineState } from "../game/types";
import { ArenaScene, type ArenaPerfStats } from "../render/arena";

type PixiArenaProps = Readonly<{
  state: EngineState;
  frozen?: boolean;
}>;

function wantsPerfOverlay(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("perf") === "1";
}

export function PixiArena({ state, frozen = false }: PixiArenaProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const frozenRef = useRef(frozen);
  const perfRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mountHost = host;
    let cancelled = false;
    let app: Application | null = null;
    let scene: ArenaScene | null = null;
    let lastRenderError: string | null = null;
    const showPerf = wantsPerfOverlay();

    async function mount() {
      const nextApp = new Application();
      // Cap the backing store around 5MP: a 3024x1602 retina viewport at
      // resolution 2 is ~19MP of vector redraw per frame and drops to slideshow
      // frame rates on integrated GPUs.
      const hostRect = mountHost.getBoundingClientRect();
      const hostArea = Math.max(1, hostRect.width * hostRect.height);
      const maxResolution = Math.sqrt(5_000_000 / hostArea);
      const resolution = Math.max(1, Math.min(2, window.devicePixelRatio || 1, maxResolution));
      await nextApp.init({
        resizeTo: mountHost,
        background: 0x03060a,
        backgroundAlpha: 1,
        antialias: true,
        autoDensity: true,
        preference: "webgl",
        resolution,
      });
      if (cancelled) {
        nextApp.destroy(true);
        return;
      }
      app = nextApp;
      nextApp.canvas.setAttribute("aria-hidden", "true");
      mountHost.appendChild(nextApp.canvas);

      scene = new ArenaScene();
      nextApp.stage.addChild(scene.root);
      if (showPerf) {
        (window as Window & { __gridwakeArena?: unknown }).__gridwakeArena = {
          getStats: () => scene?.getPerf() ?? null,
          getLastError: () => lastRenderError,
          getScreen: () => (app
            ? { w: app.screen.width, h: app.screen.height, children: app.stage.children.length }
            : null),
        };
      }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (showPerf && !perfRef.current) {
        const overlay = document.createElement("div");
        overlay.className = "arena-perf";
        overlay.setAttribute("aria-hidden", "true");
        mountHost.appendChild(overlay);
        perfRef.current = overlay;
      }

      nextApp.ticker.add(() => {
        if (!scene || !app) return;
        try {
          const current = stateRef.current;
          const nowMs = performance.now();
          scene.syncState(current, nowMs);
          const stats: ArenaPerfStats = scene.render({
            state: current,
            viewWidth: app.screen.width,
            viewHeight: app.screen.height,
            frozen: frozenRef.current,
            reducedMotion: reducedMotion.matches,
            dpr: app.renderer.resolution,
            nowMs,
          });
          lastRenderError = null;
          if (perfRef.current) {
            perfRef.current.textContent = [
              `FPS ${stats.fps}`,
              `TX ${stats.transientCount}`,
              `PX ${stats.particleCount}`,
              `${Math.round(stats.width)}×${Math.round(stats.height)}`,
              `DPR ${stats.dpr.toFixed(2)}`,
            ].join(" · ");
          }
        } catch (error) {
          lastRenderError = error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error);
          console.error("[PixiArena] render failed", error);
        }
      });
    }

    void mount();
    return () => {
      cancelled = true;
      scene?.destroy();
      scene = null;
      app?.destroy(true);
      app = null;
      perfRef.current?.remove();
      perfRef.current = null;
    };
  }, [state.seed]);

  return <div className={`pixi-arena${frozen ? " pixi-arena--frozen" : ""}`} ref={hostRef} />;
}
