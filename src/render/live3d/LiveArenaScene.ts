import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  DynamicDrawUsage,
  EdgesGeometry,
  FogExp2,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { phaseForTick } from "../../game/engine";
import {
  CORE_X,
  CORE_Y,
  GRID_COLUMNS,
  GRID_ROWS,
  TUNNEL_SCROLL_TICKS,
  type ArenaMode,
  type EngineState,
  type LightRole,
  type Point,
} from "../../game/types";
import type { DioramaAssetEntry, DioramaManifest } from "../diorama/manifest";

const ROLE_COLORS: Readonly<Record<LightRole, number>> = {
  guardian: 0xa78bfa,
  scout: 0x40e8ff,
  mender: 0xffd166,
};

const ROLE_ORDER: readonly LightRole[] = ["guardian", "scout", "mender"];
const MAX_TRAIL_POINTS = 64;

function roleLaneOffset(role: LightRole, mode: ArenaMode): number {
  if (mode !== "tunnel") {
    if (role === "guardian") return -1.05;
    if (role === "mender") return 1.05;
    return 0;
  }
  if (role === "guardian") return -1.35;
  if (role === "mender") return 1.35;
  return 0;
}

function roleDepthOffset(role: LightRole, mode: ArenaMode): number {
  if (mode !== "tunnel") {
    if (role === "scout") return -0.72;
    if (role === "mender") return 0.28;
    return 0;
  }
  if (role === "scout") return -1.75;
  if (role === "mender") return -0.45;
  return 0.2;
}

export type ArenaWorldPoint = Readonly<{ x: number; y: number; z: number }>;

/** Pure projection contract shared by scene code and tests. */
export function projectArenaPoint(point: Point, mode: ArenaMode, height = 0.46): ArenaWorldPoint {
  if (mode === "tunnel") {
    return {
      x: (point.y - CORE_Y) * 0.72,
      y: height,
      z: -(point.x - CORE_X) * 0.85,
    };
  }
  return {
    x: (point.x - CORE_X) * 0.6,
    y: height,
    z: (point.y - CORE_Y) * 0.6,
  };
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Line) && !(object instanceof LineSegments) && !(object instanceof Points)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}

function luminousMaterial(color: number, emissiveIntensity = 1.25): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    metalness: 0.68,
    roughness: 0.26,
  });
}

function normalizeModel(model: Object3D, targetSize: number): void {
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(targetSize / maxAxis);
  const normalized = new Box3().setFromObject(model);
  const center = normalized.getCenter(new Vector3());
  model.position.sub(center);
}

function tintModel(model: Object3D, color: number): void {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const source = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!(source instanceof MeshStandardMaterial)) return;
    const material = source.clone();
    material.color.lerp(new Color(color), 0.56);
    material.emissive = new Color(color);
    material.emissiveIntensity = Math.max(0.7, material.emissiveIntensity);
    material.metalness = Math.max(0.55, material.metalness);
    material.roughness = Math.min(0.38, material.roughness);
    object.material = material;
  });
}

function fallbackRole(role: LightRole): Group {
  const group = new Group();
  const color = ROLE_COLORS[role];
  if (role === "guardian") {
    const shell = new Mesh(new OctahedronGeometry(0.58, 0), luminousMaterial(color));
    shell.scale.set(1.2, 0.9, 0.56);
    group.add(shell);
    for (const side of [-1, 1]) {
      const vane = new Mesh(new BoxGeometry(0.12, 0.9, 0.1), luminousMaterial(0x6f5ba8, 0.8));
      vane.position.x = side * 0.72;
      vane.rotation.z = side * -0.32;
      group.add(vane);
    }
  } else if (role === "scout") {
    const body = new Mesh(new ConeGeometry(0.55, 1.2, 3), luminousMaterial(color));
    body.rotation.x = Math.PI / 2;
    group.add(body);
  } else {
    const halo = new Mesh(new TorusGeometry(0.58, 0.1, 8, 28), luminousMaterial(color));
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    group.add(new Mesh(new DodecahedronGeometry(0.27, 0), luminousMaterial(0xf4f7ff, 1.8)));
  }
  group.add(new Mesh(new SphereGeometry(0.14, 10, 8), luminousMaterial(0xf4f7ff, 2.3)));
  return group;
}

function fallbackCore(): Group {
  const group = new Group();
  const outer = new Mesh(new OctahedronGeometry(0.78, 0), luminousMaterial(0x40e8ff, 1.05));
  outer.material.transparent = true;
  outer.material.opacity = 0.34;
  group.add(outer);
  group.add(new Mesh(new OctahedronGeometry(0.32, 0), luminousMaterial(0xf4f7ff, 2.4)));
  const ring = new Mesh(new TorusGeometry(1.08, 0.035, 6, 42), luminousMaterial(0x40e8ff, 1.5));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

function portalFallback(): Group {
  const group = new Group();
  const material = luminousMaterial(0x17313f, 0.54);
  const guide = luminousMaterial(0x40e8ff, 1.15);
  const top = new Mesh(new BoxGeometry(10.6, 0.13, 0.12), material);
  top.position.y = 4.15;
  const left = new Mesh(new BoxGeometry(0.13, 8.3, 0.12), material);
  left.position.x = -5.2;
  const right = left.clone();
  right.position.x = 5.2;
  const strip = new Mesh(new BoxGeometry(8.4, 0.035, 0.14), guide);
  strip.position.y = 3.88;
  group.add(top, left, right, strip);
  return group;
}

function gridLines(mode: ArenaMode): Group {
  const group = new Group();
  const positions: number[] = [];
  if (mode === "tunnel") {
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const x = (row - CORE_Y) * 0.72;
      positions.push(x, 0, 8, x, 0, -24);
    }
    for (let column = 0; column <= GRID_COLUMNS + 10; column += 1) {
      const z = 8 - column * 0.85;
      positions.push(-7, 0, z, 7, 0, z);
    }
  } else {
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const x = (column - CORE_X) * 0.6;
      positions.push(x, 0, -5.4, x, 0, 5.4);
    }
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const z = (row - CORE_Y) * 0.6;
      positions.push(-9, 0, z, 9, 0, z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  const major = new LineSegments(
    geometry,
    new LineBasicMaterial({ color: 0x18384a, transparent: true, opacity: mode === "tunnel" ? 0.54 : 0.43 }),
  );
  group.add(major);
  return group;
}

function deterministicDust(): Points {
  const points: number[] = [];
  let state = 0x5f3759df;
  for (let index = 0; index < 260; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const x = ((state & 1023) / 1023 - 0.5) * 18;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const y = 0.15 + ((state & 255) / 255) * 7;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const z = ((state & 2047) / 2047) * -34 + 8;
    points.push(x, y, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  return new Points(
    geometry,
    new PointsMaterial({ color: 0x8defff, size: 0.025, transparent: true, opacity: 0.52, depthWrite: false }),
  );
}

function parseCell(key: string): Point {
  const [x, y] = key.split(":").map(Number);
  return { x, y };
}

type TrailRecord = Readonly<{
  line: Line;
  attribute: BufferAttribute;
}>;

export type LiveArenaPerf = Readonly<{ fps: number; meshes: number; mode: ArenaMode }>;

export class LiveArenaScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(46, 1, 0.1, 90);
  private readonly loader = new GLTFLoader();
  private readonly world = new Group();
  private readonly bastionGrid = gridLines("bastion");
  private readonly tunnelGrid = gridLines("tunnel");
  private readonly tunnelPortals = new Group();
  private readonly roleMounts = new Map<LightRole, Group>();
  private readonly trails = new Map<LightRole, TrailRecord>();
  private readonly coreMount = new Group();
  private readonly corruption = new Map<string, Mesh>();
  private readonly corruptionGeometry = new BoxGeometry(0.64, 0.52, 0.64, 1, 1, 1);
  private readonly corruptionMaterial = new MeshStandardMaterial({
    color: 0x420713,
    emissive: 0xff264f,
    emissiveIntensity: 1.2,
    metalness: 0.56,
    roughness: 0.3,
  });
  private readonly corruptionEdgeMaterial = new LineBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.72 });
  private readonly coreLight = new PointLight(0x40e8ff, 12, 18, 1.6);
  private readonly dangerLight = new PointLight(0xff264f, 0, 24, 1.8);
  private readonly dust = deterministicDust();
  private readonly pulseMaterial = new MeshBasicMaterial({
    color: 0x40e8ff,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  private readonly pulseRing = new Mesh(new TorusGeometry(1, 0.045, 8, 64), this.pulseMaterial);
  private readonly possessionMaterial = new MeshBasicMaterial({
    color: 0xf4f7ff,
    transparent: true,
    opacity: 0.82,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  private readonly possessionRing = new Mesh(new TorusGeometry(0.88, 0.035, 8, 48), this.possessionMaterial);
  private readonly cameraTarget = new Vector3(0, 0.35, 0);
  private readonly desiredCamera = new Vector3(0, 14, 11.5);
  private readonly desiredTarget = new Vector3(0, 0.2, 0);
  private lastStateSignature = "";
  private lastFrameMs = 0;
  private elapsed = 0;
  private frameTimes: number[] = [];
  private mode: ArenaMode = "bastion";
  private pulseAge = -1;
  private compactViewport = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.setClearColor(0x02050a, 1);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

    this.scene.background = new Color(0x02050a);
    this.scene.fog = new FogExp2(0x02050a, 0.038);
    this.scene.add(new AmbientLight(0x5d8ba2, 1.05));
    const key = new DirectionalLight(0xd9f8ff, 2.2);
    key.position.set(-4, 10, 8);
    const rim = new DirectionalLight(0x8b5cff, 1.35);
    rim.position.set(8, 5, -10);
    this.scene.add(key, rim, this.world);
    this.pulseRing.rotation.x = Math.PI / 2;
    this.pulseRing.visible = false;
    this.possessionRing.rotation.x = Math.PI / 2;
    this.possessionRing.visible = false;
    this.world.add(this.bastionGrid, this.tunnelGrid, this.tunnelPortals, this.coreMount, this.coreLight, this.dangerLight, this.dust, this.pulseRing, this.possessionRing);

    const floor = new Mesh(
      new PlaneGeometry(22, 38),
      new MeshBasicMaterial({ color: 0x061019, transparent: true, opacity: 0.72, side: DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -7;
    floor.position.y = -0.04;
    this.world.add(floor);

    for (let index = 0; index < 7; index += 1) {
      const mount = new Group();
      mount.userData.baseZ = 7 - index * 5;
      mount.add(portalFallback());
      this.tunnelPortals.add(mount);
    }

    for (const role of ROLE_ORDER) {
      const mount = new Group();
      mount.name = `${role}-live-mount`;
      mount.add(fallbackRole(role));
      this.roleMounts.set(role, mount);
      this.world.add(mount);

      const geometry = new BufferGeometry();
      const attribute = new BufferAttribute(new Float32Array(MAX_TRAIL_POINTS * 3), 3);
      attribute.setUsage(DynamicDrawUsage);
      geometry.setAttribute("position", attribute);
      geometry.setDrawRange(0, 0);
      const line = new Line(
        geometry,
        new LineBasicMaterial({ color: ROLE_COLORS[role], transparent: true, opacity: 0.42 }),
      );
      this.trails.set(role, { line, attribute });
      this.world.add(line);
    }

    this.coreMount.add(fallbackCore());
    this.coreMount.position.set(0, 0.55, 0);
    this.coreLight.position.set(0, 1.2, 0);
    this.camera.position.copy(this.desiredCamera);
    this.cameraTarget.copy(this.desiredTarget);
    this.camera.lookAt(this.cameraTarget);
    this.setMode("bastion", true);
  }

  resize(width: number, height: number): void {
    if (this.disposed || width <= 0 || height <= 0) return;
    const compact = width / height < 0.76;
    if (compact !== this.compactViewport) {
      this.compactViewport = compact;
      this.setMode(this.mode, true);
    }
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = compact ? 62 : 46;
    this.camera.updateProjectionMatrix();
  }

  private setMode(mode: ArenaMode, immediate = false): void {
    this.mode = mode;
    this.bastionGrid.visible = mode === "bastion";
    this.tunnelGrid.visible = mode === "tunnel";
    this.tunnelPortals.visible = mode === "tunnel";
    if (mode === "tunnel") {
      this.desiredCamera.set(0, this.compactViewport ? 7.2 : 4.9, this.compactViewport ? 17.2 : 10.5);
      this.desiredTarget.set(0, 0.35, -8.2);
      if (this.scene.fog instanceof FogExp2) this.scene.fog.density = 0.047;
    } else {
      this.desiredCamera.set(0, this.compactViewport ? 19 : 10.5, this.compactViewport ? 16 : 8.8);
      this.desiredTarget.set(0, 0.1, 0);
      if (this.scene.fog instanceof FogExp2) this.scene.fog.density = 0.027;
    }
    if (immediate) {
      this.camera.position.copy(this.desiredCamera);
      this.cameraTarget.copy(this.desiredTarget);
    }
  }

  private updateTrails(state: EngineState): void {
    for (const light of state.lights) {
      const trail = this.trails.get(light.role);
      if (!trail) continue;
      const points = light.trail.slice(-MAX_TRAIL_POINTS);
      points.forEach((point, index) => {
        const projected = projectArenaPoint(point, state.arena.mode, 0.12);
        trail.attribute.setXYZ(
          index,
          projected.x + roleLaneOffset(light.role, state.arena.mode),
          projected.y,
          projected.z + roleDepthOffset(light.role, state.arena.mode),
        );
      });
      trail.attribute.needsUpdate = true;
      trail.line.geometry.setDrawRange(0, points.length);
    }
  }

  private updateCorruption(state: EngineState): void {
    const living = new Set(state.corruption);
    for (const key of living) {
      let mesh = this.corruption.get(key);
      if (!mesh) {
        mesh = new Mesh(this.corruptionGeometry, this.corruptionMaterial);
        const edge = new LineSegments(new EdgesGeometry(this.corruptionGeometry), this.corruptionEdgeMaterial);
        mesh.add(edge);
        mesh.scale.setScalar(0.05);
        this.corruption.set(key, mesh);
        this.world.add(mesh);
      }
      const projected = projectArenaPoint(parseCell(key), state.arena.mode, 0.27);
      mesh.position.set(projected.x, projected.y, projected.z);
      mesh.visible = state.arena.mode !== "tunnel" || projected.z < 4;
      const gateScale = state.arena.mode === "tunnel" ? 1.06 : 0.9;
      mesh.userData.targetScale = gateScale;
      mesh.rotation.y = state.arena.mode === "tunnel" ? 0 : ((Number.parseInt(key, 10) * 0.27) % 0.22) - 0.11;
    }
    for (const [key, mesh] of this.corruption) {
      if (living.has(key)) continue;
      this.world.remove(mesh);
      this.corruption.delete(key);
    }
  }

  syncState(state: EngineState): void {
    const signature = `${state.tick}|${state.replayHash}|${state.possessedLightId ?? "none"}|${state.arena.mode}`;
    if (signature === this.lastStateSignature) return;
    this.lastStateSignature = signature;
    if (state.arena.mode !== this.mode) this.setMode(state.arena.mode);

    for (const light of state.lights) {
      const mount = this.roleMounts.get(light.role);
      if (!mount) continue;
      const projected = projectArenaPoint(light, state.arena.mode, 0.58);
      const laneOffset = roleLaneOffset(light.role, state.arena.mode);
      const depthOffset = roleDepthOffset(light.role, state.arena.mode);
      mount.userData.target = new Vector3(projected.x + laneOffset, projected.y, projected.z + depthOffset);
      mount.userData.active = light.mode === "intercept" || light.id === state.possessedLightId;
      mount.userData.possessed = light.id === state.possessedLightId;
      const target = projectArenaPoint(light.target, state.arena.mode, 0.58);
      mount.userData.look = new Vector3(target.x + laneOffset, target.y, target.z + depthOffset);
      if (!mount.userData.initialized) {
        mount.position.copy(mount.userData.target as Vector3);
        mount.userData.initialized = true;
      }
    }
    const possessed = state.lights.find((light) => light.id === state.possessedLightId);
    if (possessed) {
      const projected = projectArenaPoint(possessed, state.arena.mode, 0.16);
      this.possessionRing.position.set(
        projected.x + roleLaneOffset(possessed.role, state.arena.mode),
        projected.y,
        projected.z + roleDepthOffset(possessed.role, state.arena.mode),
      );
      this.possessionRing.visible = true;
    } else {
      this.possessionRing.visible = false;
    }
    this.updateTrails(state);
    this.updateCorruption(state);
    const phase = phaseForTick(state.tick);
    this.corruptionMaterial.emissiveIntensity = phase === "collapse" ? 2 : phase === "surge" ? 1.55 : 1.15;
    this.dangerLight.intensity = Math.max(0, (100 - state.health) * 0.075) + (phase === "collapse" ? 4 : phase === "surge" ? 1.8 : 0);
    this.dangerLight.position.set(0, 2.5, state.arena.mode === "tunnel" ? -7 : 0);
    this.pulseAge = state.pulse.usedAtTick === null ? -1 : state.tick - state.pulse.usedAtTick;
    if (this.pulseAge >= 0 && this.pulseAge <= 12) {
      const pulsePoint = projectArenaPoint({ x: state.pulse.x, y: state.pulse.y }, state.arena.mode, 0.14);
      this.pulseRing.position.set(pulsePoint.x, pulsePoint.y, pulsePoint.z);
      this.pulseRing.visible = true;
    } else {
      this.pulseRing.visible = false;
    }
  }

  render(state: EngineState, nowMs: number, reducedMotion: boolean): LiveArenaPerf {
    if (this.disposed) return { fps: 0, meshes: 0, mode: state.arena.mode };
    this.syncState(state);
    const dt = this.lastFrameMs === 0 ? 16 : Math.min(80, nowMs - this.lastFrameMs);
    this.lastFrameMs = nowMs;
    this.elapsed += dt / 1000;
    const follow = reducedMotion ? 1 : 1 - Math.exp(-(dt / 1000) * 8.5);
    this.camera.position.lerp(this.desiredCamera, follow * 0.48);
    this.cameraTarget.lerp(this.desiredTarget, follow * 0.48);
    this.camera.lookAt(this.cameraTarget);

    let index = 0;
    for (const role of ROLE_ORDER) {
      const mount = this.roleMounts.get(role);
      if (!mount) continue;
      const target = mount.userData.target as Vector3 | undefined;
      if (target) mount.position.lerp(target, follow);
      const look = mount.userData.look as Vector3 | undefined;
      if (look && mount.position.distanceToSquared(look) > 0.01) mount.lookAt(look);
      const bob = reducedMotion ? 0 : Math.sin(this.elapsed * (1.5 + index * 0.13) + index * 1.8) * 0.12;
      mount.position.y = (target?.y ?? 0.58) + bob;
      const scale = mount.userData.possessed ? 1.18 : mount.userData.active ? 1.08 : 1;
      mount.scale.lerp(new Vector3(scale, scale, scale), follow);
      index += 1;
    }

    for (const mesh of this.corruption.values()) {
      const targetScale = (mesh.userData.targetScale as number | undefined) ?? 1;
      const scale = MathUtils.lerp(mesh.scale.x, targetScale, follow * 0.8);
      mesh.scale.set(scale, state.arena.mode === "tunnel" ? scale * 1.18 : scale * 0.72, scale);
    }

    if (state.arena.mode === "tunnel") {
      const travel = state.arena.distance + (state.tick % TUNNEL_SCROLL_TICKS) / TUNNEL_SCROLL_TICKS;
      for (const mount of this.tunnelPortals.children) {
        const baseZ = mount.userData.baseZ as number;
        let z = baseZ + (travel * 0.85) % 35;
        while (z > 9) z -= 35;
        mount.position.z = z;
        mount.visible = z < -1;
      }
      this.dust.position.z = (travel * 0.18) % 6;
    } else {
      this.dust.rotation.y = reducedMotion ? 0 : this.elapsed * 0.006;
    }

    this.coreMount.rotation.y = reducedMotion ? 0.35 : this.elapsed * 0.34;
    this.coreMount.rotation.z = reducedMotion ? 0.1 : Math.sin(this.elapsed * 0.5) * 0.14;
    if (this.pulseRing.visible) {
      const pulseProgress = MathUtils.clamp(this.pulseAge / 12, 0, 1);
      const scale = 0.65 + pulseProgress * 5.4;
      this.pulseRing.scale.setScalar(scale);
      this.pulseMaterial.opacity = (1 - pulseProgress) * 0.9;
    }
    if (this.possessionRing.visible) {
      const breathe = reducedMotion ? 1 : 1 + Math.sin(this.elapsed * 5.2) * 0.12;
      this.possessionRing.scale.setScalar(breathe);
      this.possessionRing.rotation.z = reducedMotion ? 0 : this.elapsed * 0.9;
    }
    this.renderer.render(this.scene, this.camera);

    this.frameTimes.push(nowMs);
    while (this.frameTimes.length && nowMs - this.frameTimes[0]! > 1000) this.frameTimes.shift();
    return { fps: this.frameTimes.length, meshes: this.corruption.size + 4, mode: state.arena.mode };
  }

  private async loadEntry(entry: DioramaAssetEntry): Promise<Object3D> {
    return (await this.loader.loadAsync(entry.path)).scene;
  }

  private replaceMount(mount: Group, model: Object3D, targetSize: number, color: number): void {
    normalizeModel(model, targetSize);
    tintModel(model, color);
    for (const child of [...mount.children]) {
      mount.remove(child);
      disposeObject(child);
    }
    mount.add(model);
  }

  async applyManifest(manifest: DioramaManifest): Promise<number> {
    let loaded = 0;
    await Promise.all(ROLE_ORDER.map(async (role) => {
      const entry = manifest.assets[role];
      const mount = this.roleMounts.get(role);
      if (!entry || !mount || this.disposed) return;
      try {
        const model = await this.loadEntry(entry);
        this.replaceMount(mount, model, 1.45, ROLE_COLORS[role]);
        loaded += 1;
      } catch {
        // The already-mounted live fallback remains playable.
      }
    }));

    const coreEntry = manifest.assets["grid-core"];
    if (coreEntry && !this.disposed) {
      try {
        const model = await this.loadEntry(coreEntry);
        this.replaceMount(this.coreMount, model, 1.52, 0x40e8ff);
        loaded += 1;
      } catch {
        // Keep the procedural core.
      }
    }

    // The authored rib is used in the landing diorama. The live chase camera
    // deliberately keeps the portal rig procedural: its guaranteed open
    // center prevents generated shell geometry from occluding the playfield.
    return loaded;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeObject(this.scene);
    this.corruptionGeometry.dispose();
    this.corruptionMaterial.dispose();
    this.corruptionEdgeMaterial.dispose();
    this.pulseMaterial.dispose();
    this.possessionMaterial.dispose();
    this.renderer.dispose();
    this.corruption.clear();
  }
}
