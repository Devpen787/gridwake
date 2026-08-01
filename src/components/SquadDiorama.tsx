import { useEffect, useRef, useState } from "react";
import { DioramaScene } from "../render/diorama/DioramaScene";
import { fetchDioramaManifest } from "../render/diorama/manifest";

type DioramaStatus = "booting" | "procedural" | "thrixel" | "unavailable";

export default function SquadDiorama() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<DioramaStatus>("booting");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let scene: DioramaScene | null = null;
    let animationFrame = 0;
    let cancelled = false;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    try {
      scene = new DioramaScene(canvas);
    } catch {
      setStatus("unavailable");
      return;
    }

    const activeScene = scene;
    const resizeObserver = new ResizeObserver(([entry]) => {
      activeScene.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(host);
    const initial = host.getBoundingClientRect();
    activeScene.resize(initial.width, initial.height);

    const frame = (now: number) => {
      activeScene.render((now - startedAt) / 1000, reducedMotion.matches);
      if (!reducedMotion.matches && !document.hidden) animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);

    void fetchDioramaManifest().then(async (manifest) => {
      if (cancelled || !manifest) {
        if (!cancelled) setStatus("procedural");
        return;
      }
      const loaded = await activeScene.applyManifest(manifest);
      if (!cancelled) setStatus(loaded > 0 ? "thrixel" : "procedural");
    });

    const handleVisibility = () => {
      cancelAnimationFrame(animationFrame);
      if (!document.hidden) animationFrame = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibility);
      resizeObserver.disconnect();
      activeScene.destroy();
      scene = null;
    };
  }, []);

  return (
    <figure className={`squad-diorama squad-diorama--${status}`} ref={hostRef} aria-label="Guardian, Scout, and Mender entering the Gridwake tunnel">
      <canvas ref={canvasRef} aria-hidden="true" />
      <figcaption>
        <span className="squad-diorama__role squad-diorama__role--guardian">GUARDIAN</span>
        <span className="squad-diorama__role squad-diorama__role--scout">SCOUT</span>
        <span className="squad-diorama__role squad-diorama__role--mender">MENDER</span>
      </figcaption>
      <span className="squad-diorama__status" aria-hidden="true">
        {status === "thrixel" ? "FORGED ASSETS" : status === "unavailable" ? "TACTICAL LINK" : "SQUAD LINK"}
      </span>
    </figure>
  );
}
