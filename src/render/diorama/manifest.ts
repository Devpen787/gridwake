export const DIORAMA_ASSET_IDS = [
  "tunnel-rib",
  "guardian",
  "scout",
  "mender",
  "grid-core",
  "corruption-gate",
] as const;

export type DioramaAssetId = (typeof DIORAMA_ASSET_IDS)[number];

export type DioramaAssetEntry = Readonly<{
  path: string;
  source: "thrixel";
  bytes: number;
  submissionId: string;
}>;

export type DioramaAttribution = Readonly<{
  label: string;
  url: string;
  license: string;
}>;

export type DioramaManifest = Readonly<{
  version: 1;
  status: "procedural-fallback" | "thrixel-assets";
  generatedAt: string | null;
  attribution: DioramaAttribution | null;
  assets: Readonly<Record<DioramaAssetId, DioramaAssetEntry | null>>;
}>;

function isAssetEntry(value: unknown): value is DioramaAssetEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.path === "string"
    && entry.path.startsWith("/assets/gridwake/")
    && entry.path.endsWith(".glb")
    && entry.source === "thrixel"
    && typeof entry.bytes === "number"
    && entry.bytes > 0
    && typeof entry.submissionId === "string"
  );
}

export function parseDioramaManifest(value: unknown): DioramaManifest | null {
  if (typeof value !== "object" || value === null) return null;
  const manifest = value as Record<string, unknown>;
  if (manifest.version !== 1) return null;
  if (manifest.status !== "procedural-fallback" && manifest.status !== "thrixel-assets") return null;
  if (typeof manifest.assets !== "object" || manifest.assets === null) return null;
  const assets = manifest.assets as Record<string, unknown>;
  for (const id of DIORAMA_ASSET_IDS) {
    if (!(id in assets)) return null;
    if (assets[id] !== null && !isAssetEntry(assets[id])) return null;
  }
  if (manifest.generatedAt !== null && typeof manifest.generatedAt !== "string") return null;
  if (manifest.attribution !== null) {
    if (typeof manifest.attribution !== "object" || manifest.attribution === null) return null;
    const attribution = manifest.attribution as Record<string, unknown>;
    if (
      typeof attribution.label !== "string"
      || typeof attribution.url !== "string"
      || typeof attribution.license !== "string"
    ) return null;
  }
  return manifest as DioramaManifest;
}

export async function fetchDioramaManifest(
  fetcher: typeof fetch = fetch,
): Promise<DioramaManifest | null> {
  try {
    const response = await fetcher("/assets/gridwake/manifest.json", { cache: "no-cache" });
    if (!response.ok) return null;
    return parseDioramaManifest(await response.json());
  } catch {
    return null;
  }
}
