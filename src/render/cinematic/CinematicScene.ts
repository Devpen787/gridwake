import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  type CellVisual,
  syncCorruptionVisuals,
} from "../../components/arena-fx";
import { phaseForTick } from "../../game/engine";
import {
  CORE_X,
  CORE_Y,
  GRID_COLUMNS,
  GRID_ROWS,
  type EngineState,
  type LightRole,
  type RoundPhase,
} from "../../game/types";
import { defaultWarpParams, sampleWarp, type WarpParams } from "./warp";

export type CinematicPerf = Readonly<{
  fps: number;
  transientCount: number;
  particleCount: number;
  width: number;
  height: number;
  dpr: number;
}>;

/** Cell space → centred world XYZ (game +Y down → world +Y up). */
function toWorld(cellX: number, cellY: number, z: number): Vector3 {
  return new Vector3(cellX - CORE_X, CORE_Y - cellY, z);
}

function roleHex(role: LightRole): number {
  switch (role) {
    case "guardian":
      return 0x40e8ff;
    case "scout":
      return 0xffc14d;
    case "mender":
      return 0xc084fc;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function phaseBloom(phase: RoundPhase, frozen: boolean, reducedMotion: boolean): number {
  if (frozen) return 0.28;
  if (reducedMotion) return 0.22;
  switch (phase) {
    case "probe":
      return 0.38;
    case "surge":
      return 0.48;
    case "collapse":
      return 0.58;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function diamondLoop(scale: number): BufferGeometry {
  const s = scale;
  const geom = new BufferGeometry();
  geom.setAttribute(
    "position",
    new Float32BufferAttribute([
      0, s, 0,
      s * 0.72, 0, 0,
      0, -s, 0,
      -s * 0.72, 0, 0,
    ], 3),
  );
  return geom;
}

type RoleMarker = {
  group: Group;
  outline: LineLoop;
  material: LineBasicMaterial;
  fill: Mesh;
};

export class CinematicScene {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly root = new Group();
  private readonly visuals = new Map<string, CellVisual>();

  private readonly gridGeom = new BufferGeometry();
  private readonly gridBase: Float32Array;
  private gridPositions: Float32Array<ArrayBufferLike>;
  private readonly gridLineCount: number;
  private readonly gridMaterial: LineBasicMaterial;

  private readonly trailGeom = new BufferGeometry();
  private trailPositions: Float32Array<ArrayBufferLike> = new Float32Array(3600);
  private trailColors: Float32Array<ArrayBufferLike> = new Float32Array(3600);
  private readonly trailMaterial: LineBasicMaterial;

  private readonly corruptionGeom = new BufferGeometry();
  private corruptionPositions: Float32Array<ArrayBufferLike> = new Float32Array(8000 * 3);
  private corruptionColors: Float32Array<ArrayBufferLike> = new Float32Array(8000 * 3);
  private readonly corruptionMaterial: LineBasicMaterial;

  private readonly corruptionFillGeom = new BufferGeometry();
  private corruptionFillPositions: Float32Array<ArrayBufferLike> = new Float32Array(18000 * 3);
  private corruptionFillColors: Float32Array<ArrayBufferLike> = new Float32Array(18000 * 3);
  private readonly corruptionFillMaterial: MeshBasicMaterial;

  private readonly roleMarkers: RoleMarker[] = [];
  private readonly coreGroup = new Group();
  private readonly coreInner: LineLoop;
  private readonly coreOuter: LineLoop;
  private readonly coreInnerMat: LineBasicMaterial;
  private readonly coreOuterMat: LineBasicMaterial;

  private frameTimes: number[] = [];
  private lastPerf: CinematicPerf = {
    fps: 0,
    transientCount: 0,
    particleCount: 0,
    width: 0,
    height: 0,
    dpr: 1,
  };
  private lastHealth = 100;
  private cameraKick = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x02050a, 1);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    // Orthographic board camera — fills the arena shell; XY warp supplies the funnel drama.
    this.camera = new OrthographicCamera(-16, 16, 10, -10, 0.1, 200);
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(0, -2.2, 48);
    this.camera.lookAt(0, 0.3, 0);

    this.scene.add(this.root);

    const voidPlane = new Mesh(
      new PlaneGeometry(90, 60),
      new MeshBasicMaterial({ color: 0x050a12 }),
    );
    voidPlane.position.set(0, 0, -3.2);
    this.root.add(voidPlane);

    const skeleton = this.buildGridSkeleton();
    this.gridBase = skeleton.base;
    this.gridPositions = new Float32Array(skeleton.base);
    this.gridLineCount = skeleton.lineCount;
    this.gridGeom.setAttribute("position", new Float32BufferAttribute(this.gridPositions, 3));
    // Three.js copies typed arrays into BufferAttribute — keep a live handle.
    this.gridPositions = this.gridGeom.attributes.position!.array as Float32Array<ArrayBufferLike>;
    this.gridMaterial = new LineBasicMaterial({
      color: 0x2bb8d0,
      transparent: true,
      opacity: 0.38,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.root.add(new LineSegments(this.gridGeom, this.gridMaterial));

    this.trailGeom.setAttribute("position", new Float32BufferAttribute(this.trailPositions, 3));
    this.trailGeom.setAttribute("color", new Float32BufferAttribute(this.trailColors, 3));
    this.trailPositions = this.trailGeom.attributes.position!.array as Float32Array<ArrayBufferLike>;
    this.trailColors = this.trailGeom.attributes.color!.array as Float32Array<ArrayBufferLike>;
    this.trailMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.root.add(new LineSegments(this.trailGeom, this.trailMaterial));

    // Corruption body — filled quads so it reads as one organism, not shard spaghetti.
    this.corruptionFillGeom.setAttribute("position", new Float32BufferAttribute(this.corruptionFillPositions, 3));
    this.corruptionFillGeom.setAttribute("color", new Float32BufferAttribute(this.corruptionFillColors, 3));
    this.corruptionFillPositions = this.corruptionFillGeom.attributes.position!.array as Float32Array<ArrayBufferLike>;
    this.corruptionFillColors = this.corruptionFillGeom.attributes.color!.array as Float32Array<ArrayBufferLike>;
    this.corruptionFillMaterial = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: DoubleSide,
    });
    this.root.add(new Mesh(this.corruptionFillGeom, this.corruptionFillMaterial));

    this.corruptionGeom.setAttribute("position", new Float32BufferAttribute(this.corruptionPositions, 3));
    this.corruptionGeom.setAttribute("color", new Float32BufferAttribute(this.corruptionColors, 3));
    this.corruptionPositions = this.corruptionGeom.attributes.position!.array as Float32Array<ArrayBufferLike>;
    this.corruptionColors = this.corruptionGeom.attributes.color!.array as Float32Array<ArrayBufferLike>;
    this.corruptionMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.root.add(new LineSegments(this.corruptionGeom, this.corruptionMaterial));

    for (let i = 0; i < 3; i += 1) {
      const material = new LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
        linewidth: 2,
      });
      const innerMat = new LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const outline = new LineLoop(diamondLoop(0.72), material);
      const inner = new LineLoop(diamondLoop(0.34), innerMat);
      const fill = new Mesh(
        new PlaneGeometry(0.28, 0.28),
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      fill.rotation.z = Math.PI / 4;
      const group = new Group();
      group.add(outline);
      group.add(inner);
      group.add(fill);
      group.visible = false;
      this.root.add(group);
      this.roleMarkers.push({ group, outline, material, fill });
    }

    this.coreInnerMat = new LineBasicMaterial({
      color: 0xf4f7ff,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.coreOuterMat = new LineBasicMaterial({
      color: 0x40e8ff,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.coreInner = new LineLoop(diamondLoop(0.95), this.coreInnerMat);
    this.coreOuter = new LineLoop(diamondLoop(1.55), this.coreOuterMat);
    this.coreGroup.add(this.coreOuter);
    this.coreGroup.add(this.coreInner);
    const coreFill = new Mesh(
      new PlaneGeometry(0.7, 0.7),
      new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    coreFill.rotation.z = Math.PI / 4;
    this.coreGroup.add(coreFill);
    // Tiny crosshair
    const cross = new BufferGeometry();
    cross.setAttribute(
      "position",
      new Float32BufferAttribute([
        -0.35, 0, 0.05, 0.35, 0, 0.05,
        0, -0.35, 0.05, 0, 0.35, 0.05,
      ], 3),
    );
    this.coreGroup.add(new LineSegments(
      cross,
      new LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ));
    this.root.add(this.coreGroup);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(512, 512), 0.42, 0.32, 0.42);
    this.composer.addPass(this.bloom);
  }

  private buildGridSkeleton(): { base: Float32Array; lineCount: number } {
    const verts: number[] = [];
    for (let x = 0; x <= GRID_COLUMNS; x += 1) {
      for (let y = 0; y < GRID_ROWS; y += 1) {
        const a = toWorld(x, y, 0);
        const b = toWorld(x, y + 1, 0);
        verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let y = 0; y <= GRID_ROWS; y += 1) {
      for (let x = 0; x < GRID_COLUMNS; x += 1) {
        const a = toWorld(x, y, 0);
        const b = toWorld(x + 1, y, 0);
        verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    return { base: new Float32Array(verts), lineCount: verts.length / 3 };
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    const aspect = w / h;
    const margin = 0.7;
    const halfBoardW = GRID_COLUMNS / 2 + margin;
    const halfBoardH = GRID_ROWS / 2 + margin;
    // Cover the full board (letterbox with void rather than crop).
    let halfW = halfBoardW;
    let halfH = halfW / aspect;
    if (halfH < halfBoardH) {
      halfH = halfBoardH;
      halfW = halfH * aspect;
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.position.set(0, -1.8, 52);
    this.camera.lookAt(0, 0.25, 0);
    this.camera.updateProjectionMatrix();

    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  syncState(state: EngineState): void {
    if (state.health < this.lastHealth) this.cameraKick = 1;
    this.lastHealth = state.health;
    syncCorruptionVisuals(this.visuals, state.corruption, state.tick);
  }

  render(args: Readonly<{
    state: EngineState;
    width: number;
    height: number;
    frozen: boolean;
    reducedMotion: boolean;
    dpr: number;
    nowMs: number;
  }>): CinematicPerf {
    const { state, width, height, frozen, reducedMotion, dpr, nowMs } = args;
    this.resize(width, height, dpr);

    const phase = phaseForTick(state.tick);
    let warp: WarpParams = defaultWarpParams(reducedMotion);
    if (state.pulse.usedAtTick !== null) {
      const age = state.tick - state.pulse.usedAtTick;
      if (age >= 0 && age <= 14) {
        const progress = age / 14;
        warp = {
          ...warp,
          pulseX: state.pulse.x,
          pulseY: state.pulse.y,
          pulseRadius: 0.6 + progress * 9.5,
          pulseStrength: 1 - progress,
        };
      }
    }

    this.warpGrid(warp, nowMs, reducedMotion);
    this.updateCorruption(state, warp);
    this.updateTrails(state, warp);
    this.updateRoles(state, warp);
    this.updateCore(state, warp, phase);

    this.bloom.strength = phaseBloom(phase, frozen, reducedMotion);
    this.gridMaterial.opacity = frozen ? 0.24 : phase === "collapse" ? 0.48 : 0.36;
    this.gridMaterial.color.set(phase === "collapse" ? 0xff6b86 : 0x2bb8d0);

    if (!reducedMotion && !frozen && this.cameraKick > 0) {
      this.camera.position.x = Math.sin(nowMs * 0.05) * this.cameraKick * 0.35;
      this.cameraKick = Math.max(0, this.cameraKick - 0.07);
    } else {
      this.camera.position.x = 0;
    }

    this.composer.render();

    this.frameTimes.push(nowMs);
    while (this.frameTimes.length > 0 && nowMs - this.frameTimes[0]! > 1000) {
      this.frameTimes.shift();
    }
    this.lastPerf = {
      fps: this.frameTimes.length,
      transientCount: this.visuals.size + state.impacts.length,
      particleCount: state.corruption.size,
      width,
      height,
      dpr,
    };
    return this.lastPerf;
  }

  private warpGrid(warp: WarpParams, nowMs: number, reducedMotion: boolean): void {
    const breath = reducedMotion ? 0 : Math.sin(nowMs * 0.0011) * 0.04;
    for (let i = 0; i < this.gridBase.length; i += 3) {
      const wx = this.gridBase[i]!;
      const wy = this.gridBase[i + 1]!;
      const cellX = wx + CORE_X;
      const cellY = CORE_Y - wy;
      const sample = sampleWarp(cellX, cellY, GRID_COLUMNS, GRID_ROWS, warp);
      const world = toWorld(
        sample.x,
        sample.y,
        sample.z + breath * Math.sin(cellX * 0.35 + cellY * 0.28),
      );
      this.gridPositions[i] = world.x;
      this.gridPositions[i + 1] = world.y;
      this.gridPositions[i + 2] = world.z;
    }
    this.gridGeom.attributes.position!.needsUpdate = true;
    this.gridGeom.setDrawRange(0, this.gridLineCount);
  }

  private warped(cellX: number, cellY: number, warp: WarpParams): Vector3 {
    const sample = sampleWarp(cellX, cellY, GRID_COLUMNS, GRID_ROWS, warp);
    return toWorld(sample.x, sample.y, sample.z);
  }

  private updateCorruption(state: EngineState, warp: WarpParams): void {
    const body = new Color(0x3a0a14);
    const vein = new Color(0xff4d6d);
    const frontier = new Color(0xff6b86);
    const cells = new Set(state.corruption);
    let edgeI = 0;
    let fillI = 0;

    const pushEdge = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, c: Color) => {
      if (edgeI + 2 >= 7900) return;
      this.corruptionPositions[edgeI * 3] = ax;
      this.corruptionPositions[edgeI * 3 + 1] = ay;
      this.corruptionPositions[edgeI * 3 + 2] = az;
      this.corruptionColors[edgeI * 3] = c.r;
      this.corruptionColors[edgeI * 3 + 1] = c.g;
      this.corruptionColors[edgeI * 3 + 2] = c.b;
      edgeI += 1;
      this.corruptionPositions[edgeI * 3] = bx;
      this.corruptionPositions[edgeI * 3 + 1] = by;
      this.corruptionPositions[edgeI * 3 + 2] = bz;
      this.corruptionColors[edgeI * 3] = c.r;
      this.corruptionColors[edgeI * 3 + 1] = c.g;
      this.corruptionColors[edgeI * 3 + 2] = c.b;
      edgeI += 1;
    };

    const pushTri = (a: Vector3, b: Vector3, c: Vector3, color: Color) => {
      if (fillI + 3 >= 17900) return;
      for (const p of [a, b, c]) {
        this.corruptionFillPositions[fillI * 3] = p.x;
        this.corruptionFillPositions[fillI * 3 + 1] = p.y;
        this.corruptionFillPositions[fillI * 3 + 2] = p.z + 0.08;
        this.corruptionFillColors[fillI * 3] = color.r;
        this.corruptionFillColors[fillI * 3 + 1] = color.g;
        this.corruptionFillColors[fillI * 3 + 2] = color.b;
        fillI += 1;
      }
    };

    for (const key of cells) {
      const split = key.split(":");
      const cx = Number(split[0]);
      const cy = Number(split[1]);
      const n = cells.has(`${cx}:${cy - 1}`);
      const e = cells.has(`${cx + 1}:${cy}`);
      const s = cells.has(`${cx}:${cy + 1}`);
      const w = cells.has(`${cx - 1}:${cy}`);
      // Slight inset only on exposed faces so adjacent cells fuse into one mass.
      const inset = 0.08;
      const x0 = cx + (w ? 0 : inset);
      const y0 = cy + (n ? 0 : inset);
      const x1 = cx + 1 - (e ? 0 : inset);
      const y1 = cy + 1 - (s ? 0 : inset);
      const c00 = this.warped(x0, y0, warp);
      const c10 = this.warped(x1, y0, warp);
      const c11 = this.warped(x1, y1, warp);
      const c01 = this.warped(x0, y1, warp);
      pushTri(c00, c10, c11, body);
      pushTri(c00, c11, c01, body);

      // Exterior veins only — organism silhouette, not every cell outline.
      if (!n) pushEdge(c00.x, c00.y, c00.z + 0.14, c10.x, c10.y, c10.z + 0.14, frontier);
      if (!e) pushEdge(c10.x, c10.y, c10.z + 0.14, c11.x, c11.y, c11.z + 0.14, vein);
      if (!s) pushEdge(c11.x, c11.y, c11.z + 0.14, c01.x, c01.y, c01.z + 0.14, frontier);
      if (!w) pushEdge(c01.x, c01.y, c01.z + 0.14, c00.x, c00.y, c00.z + 0.14, vein);
    }

    this.corruptionFillGeom.setDrawRange(0, fillI);
    this.corruptionFillGeom.attributes.position!.needsUpdate = true;
    this.corruptionFillGeom.attributes.color!.needsUpdate = true;
    this.corruptionGeom.setDrawRange(0, edgeI);
    this.corruptionGeom.attributes.position!.needsUpdate = true;
    this.corruptionGeom.attributes.color!.needsUpdate = true;
  }

  private updateTrails(state: EngineState, warp: WarpParams): void {
    let cursor = 0;
    for (const light of state.lights) {
      const color = new Color(roleHex(light.role));
      const trail = light.trail.length > 28 ? light.trail.slice(-28) : light.trail;
      for (let index = 1; index < trail.length; index += 1) {
        if (cursor + 6 >= this.trailPositions.length) break;
        if (light.role === "scout" && index % 2 === 0) continue;
        const from = trail[index - 1]!;
        const to = trail[index]!;
        const a = this.warped(from.x + 0.5, from.y + 0.5, warp);
        const b = this.warped(to.x + 0.5, to.y + 0.5, warp);
        const fade = index / trail.length;
        this.trailPositions[cursor] = a.x;
        this.trailPositions[cursor + 1] = a.y;
        this.trailPositions[cursor + 2] = a.z + 0.2;
        this.trailPositions[cursor + 3] = b.x;
        this.trailPositions[cursor + 4] = b.y;
        this.trailPositions[cursor + 5] = b.z + 0.2;
        this.trailColors[cursor] = color.r * fade * 0.55;
        this.trailColors[cursor + 1] = color.g * fade * 0.55;
        this.trailColors[cursor + 2] = color.b * fade * 0.55;
        this.trailColors[cursor + 3] = color.r * fade;
        this.trailColors[cursor + 4] = color.g * fade;
        this.trailColors[cursor + 5] = color.b * fade;
        cursor += 6;
      }
    }
    this.trailGeom.setDrawRange(0, cursor / 3);
    this.trailGeom.attributes.position!.needsUpdate = true;
    this.trailGeom.attributes.color!.needsUpdate = true;
  }

  private updateRoles(state: EngineState, warp: WarpParams): void {
    for (let index = 0; index < this.roleMarkers.length; index += 1) {
      const marker = this.roleMarkers[index]!;
      const light = state.lights[index];
      if (!light) {
        marker.group.visible = false;
        continue;
      }
      const x = light.previousX + (light.x - light.previousX) * 0.72;
      const y = light.previousY + (light.y - light.previousY) * 0.72;
      const p = this.warped(x + 0.5, y + 0.5, warp);
      marker.group.visible = true;
      marker.group.position.set(p.x, p.y, p.z + 0.55);
      const scale = light.role === "guardian" ? 1.25 : light.role === "scout" ? 1.0 : 1.15;
      marker.group.scale.setScalar(scale);
      const hex = roleHex(light.role);
      marker.material.color.set(hex);
      (marker.fill.material as MeshBasicMaterial).color.set(hex);
    }
  }

  private updateCore(state: EngineState, warp: WarpParams, phase: RoundPhase): void {
    const p = this.warped(CORE_X, CORE_Y, warp);
    this.coreGroup.position.set(p.x, p.y, p.z + 0.7);
    const tension = 1 - state.health / 100;
    const hot = tension > 0.55 || phase === "collapse";
    this.coreInnerMat.color.set(hot ? 0xff4d6d : 0xf4f7ff);
    this.coreOuterMat.color.set(hot ? 0xff4d6d : 0x40e8ff);
    const pulse = 1 + Math.sin(state.tick * 0.35) * 0.04;
    this.coreGroup.scale.setScalar((1.05 + (1 - tension) * 0.2) * pulse);
  }

  getPerf(): CinematicPerf {
    return this.lastPerf;
  }

  destroy(): void {
    this.composer.dispose();
    this.renderer.dispose();
    this.gridMaterial.dispose();
    this.trailMaterial.dispose();
    this.corruptionMaterial.dispose();
    this.corruptionFillMaterial.dispose();
    this.coreInnerMat.dispose();
    this.coreOuterMat.dispose();
    for (const marker of this.roleMarkers) {
      marker.material.dispose();
      marker.outline.geometry.dispose();
      (marker.fill.material as MeshBasicMaterial).dispose();
      marker.fill.geometry.dispose();
    }
    this.visuals.clear();
  }
}
