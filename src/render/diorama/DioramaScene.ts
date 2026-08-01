import {
  AdditiveBlending,
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { DioramaAssetEntry, DioramaManifest } from "./manifest";

const ROLE_COLORS = {
  guardian: 0xa78bfa,
  scout: 0x40e8ff,
  mender: 0xffd166,
} as const;

type DioramaRole = keyof typeof ROLE_COLORS;

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}

function luminousMaterial(color: number, opacity = 1): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.45,
    metalness: 0.72,
    roughness: 0.28,
    transparent: opacity < 1,
    opacity,
  });
}

function wireMaterial(color: number, opacity = 0.5): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
}

function makeGuardian(): Group {
  const group = new Group();
  group.name = "guardian-fallback";
  const shell = new Mesh(new OctahedronGeometry(0.66, 0), luminousMaterial(ROLE_COLORS.guardian, 0.82));
  shell.scale.set(1.18, 1.02, 0.56);
  group.add(shell);
  const core = new Mesh(new OctahedronGeometry(0.27, 0), luminousMaterial(0xf4f7ff));
  group.add(core);
  for (const side of [-1, 1]) {
    const vane = new Mesh(new BoxGeometry(0.18, 1.24, 0.12), luminousMaterial(0x44515f, 0.88));
    vane.position.x = side * 0.82;
    vane.rotation.z = side * -0.28;
    group.add(vane);
  }
  return group;
}

function makeScout(): Group {
  const group = new Group();
  group.name = "scout-fallback";
  const body = new Mesh(new ConeGeometry(0.64, 1.4, 3), luminousMaterial(ROLE_COLORS.scout, 0.88));
  body.rotation.z = -Math.PI / 2;
  body.rotation.y = Math.PI / 2;
  group.add(body);
  const core = new Mesh(new SphereGeometry(0.24, 10, 8), luminousMaterial(0xf4f7ff));
  group.add(core);
  for (let index = 0; index < 3; index += 1) {
    const fin = new Mesh(new ConeGeometry(0.19, 0.72, 3), luminousMaterial(0x244753, 0.9));
    fin.rotation.z = (index / 3) * Math.PI * 2;
    fin.position.set(Math.cos(fin.rotation.z) * 0.58, Math.sin(fin.rotation.z) * 0.58, -0.22);
    group.add(fin);
  }
  return group;
}

function makeMender(): Group {
  const group = new Group();
  group.name = "mender-fallback";
  const halo = new Mesh(new TorusGeometry(0.72, 0.09, 8, 28), luminousMaterial(ROLE_COLORS.mender, 0.8));
  group.add(halo);
  const core = new Mesh(new DodecahedronGeometry(0.32, 0), luminousMaterial(0xf4f7ff));
  group.add(core);
  for (let index = 0; index < 3; index += 1) {
    const arm = new Mesh(new BoxGeometry(0.1, 0.72, 0.1), luminousMaterial(0x594c2d, 0.9));
    arm.rotation.z = (index / 3) * Math.PI * 2;
    arm.position.set(Math.sin(arm.rotation.z) * 0.42, Math.cos(arm.rotation.z) * 0.42, -0.18);
    group.add(arm);
  }
  return group;
}

function makeCore(): Group {
  const group = new Group();
  group.name = "core-fallback";
  const shell = new Mesh(new OctahedronGeometry(0.72, 0), wireMaterial(0x40e8ff, 0.55));
  shell.rotation.z = Math.PI / 4;
  group.add(shell);
  const inner = new Mesh(new OctahedronGeometry(0.34, 0), luminousMaterial(0xf4f7ff));
  group.add(inner);
  const ring = new Mesh(new RingGeometry(0.96, 1.01, 36), wireMaterial(0x40e8ff, 0.42));
  group.add(ring);
  return group;
}

function makeTunnelRib(): Group {
  const group = new Group();
  const beamMaterial = luminousMaterial(0x17313f, 0.72);
  const railMaterial = luminousMaterial(0x40e8ff, 0.34);
  const horizontal = new BoxGeometry(7.8, 0.08, 0.12);
  const vertical = new BoxGeometry(0.08, 4.4, 0.12);
  for (const y of [-2.05, 2.05]) {
    const beam = new Mesh(horizontal, beamMaterial);
    beam.position.y = y;
    group.add(beam);
  }
  for (const x of [-3.72, 3.72]) {
    const beam = new Mesh(vertical, beamMaterial);
    beam.position.x = x;
    group.add(beam);
  }
  const guide = new Mesh(new BoxGeometry(0.06, 3.45, 0.08), railMaterial);
  guide.position.x = -3.49;
  group.add(guide);
  return group;
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
    if (!(source instanceof MeshStandardMaterial) || source.map) return;
    const material = source.clone();
    material.color.lerp(new Color(color), 0.35);
    material.emissive = new Color(color);
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.42);
    object.material = material;
  });
}

export class DioramaScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(34, 1, 0.1, 80);
  private readonly root = new Group();
  private readonly roles: Record<DioramaRole, Group>;
  private readonly core = new Group();
  private readonly ribs: Group[] = [];
  private readonly loader = new GLTFLoader();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.camera.position.set(0, 0.82, 8.25);
    this.camera.lookAt(0, -0.08, -1.15);
    this.scene.add(new AmbientLight(0x89b9cf, 1.2));
    const key = new DirectionalLight(0xf4f7ff, 2.8);
    key.position.set(-3, 5, 7);
    this.scene.add(key, this.root);

    for (let index = 0; index < 5; index += 1) {
      const rib = makeTunnelRib();
      rib.position.z = -index * 3.4;
      rib.scale.setScalar(1 + index * 0.055);
      this.ribs.push(rib);
      this.root.add(rib);
    }

    this.roles = {
      guardian: this.mountRole(makeGuardian(), -2.25, -0.28, 0.2),
      scout: this.mountRole(makeScout(), 0, 0.18, -0.5),
      mender: this.mountRole(makeMender(), 2.25, -0.24, 0.1),
    };
    this.core.add(makeCore());
    this.core.position.set(0, -0.02, -3.1);
    this.core.scale.setScalar(0.88);
    this.root.add(this.core);
  }

  private mountRole(model: Group, x: number, y: number, z: number): Group {
    const mount = new Group();
    mount.add(model);
    mount.position.set(x, y, z);
    this.root.add(mount);
    return mount;
  }

  resize(width: number, height: number): void {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(elapsedSeconds: number, reducedMotion: boolean): void {
    if (this.disposed) return;
    const time = reducedMotion ? 0.7 : elapsedSeconds;
    this.roles.guardian.position.y = -0.28 + Math.sin(time * 1.25) * 0.09;
    this.roles.scout.position.y = 0.18 + Math.sin(time * 1.55 + 1.7) * 0.12;
    this.roles.mender.position.y = -0.24 + Math.sin(time * 1.05 + 3.2) * 0.08;
    this.roles.guardian.rotation.y = Math.sin(time * 0.55) * 0.18;
    this.roles.scout.rotation.y = Math.sin(time * 0.68 + 0.5) * 0.24;
    this.roles.mender.rotation.y = Math.sin(time * 0.48 + 1.3) * 0.16;
    this.core.rotation.z = time * 0.16;
    this.core.rotation.y = time * -0.21;
    if (!reducedMotion) {
      for (let index = 0; index < this.ribs.length; index += 1) {
        this.ribs[index].position.z = -((index * 3.4 - time * 1.15 + 17) % 17);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  private async loadEntry(entry: DioramaAssetEntry): Promise<Object3D> {
    const gltf = await this.loader.loadAsync(entry.path);
    return gltf.scene;
  }

  async applyManifest(manifest: DioramaManifest): Promise<number> {
    let loaded = 0;
    const roleEntries: readonly [DioramaRole, DioramaAssetEntry | null][] = [
      ["guardian", manifest.assets.guardian],
      ["scout", manifest.assets.scout],
      ["mender", manifest.assets.mender],
    ];
    for (const [role, entry] of roleEntries) {
      if (!entry || this.disposed) continue;
      try {
        const model = await this.loadEntry(entry);
        normalizeModel(model, 1.65);
        tintModel(model, ROLE_COLORS[role]);
        const mount = this.roles[role];
        for (const child of [...mount.children]) {
          mount.remove(child);
          disposeObject(child);
        }
        mount.add(model);
        loaded += 1;
      } catch {
        // Keep the already-mounted procedural role.
      }
    }

    const coreEntry = manifest.assets["grid-core"];
    if (coreEntry && !this.disposed) {
      try {
        const model = await this.loadEntry(coreEntry);
        normalizeModel(model, 2.2);
        tintModel(model, 0x40e8ff);
        for (const child of [...this.core.children]) {
          this.core.remove(child);
          disposeObject(child);
        }
        this.core.add(model);
        loaded += 1;
      } catch {
        // Keep procedural core.
      }
    }

    const tunnelEntry = manifest.assets["tunnel-rib"];
    if (tunnelEntry && !this.disposed) {
      try {
        const model = await this.loadEntry(tunnelEntry);
        normalizeModel(model, 7.8);
        tintModel(model, 0x40e8ff);
        for (let index = 0; index < this.ribs.length; index += 1) {
          const rib = this.ribs[index];
          for (const child of [...rib.children]) {
            rib.remove(child);
            disposeObject(child);
          }
          // Three clones intentionally share immutable geometry. Keep the
          // original alive as the first instance so none of the clones point
          // at a prematurely disposed buffer.
          rib.add(index === 0 ? model : model.clone(true));
        }
        loaded += 1;
      } catch {
        // Keep procedural tunnel.
      }
    }
    return loaded;
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeObject(this.root);
    this.renderer.dispose();
  }
}
