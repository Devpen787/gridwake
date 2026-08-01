import { describe, expect, it } from "vitest";
import { parseDioramaManifest } from "../src/render/diorama/manifest";

type TestManifest = {
  version: number;
  status: string;
  generatedAt: string | null;
  attribution: null | Record<string, string>;
  assets: Record<string, unknown>;
};

function fallbackManifest(): TestManifest {
  return {
    version: 1,
    status: "procedural-fallback",
    generatedAt: null,
    attribution: null,
    assets: {
      "tunnel-rib": null,
      guardian: null,
      scout: null,
      mender: null,
      "grid-core": null,
      "corruption-gate": null,
    },
  };
}

describe("diorama asset manifest", () => {
  it("accepts the procedural fallback contract", () => {
    expect(parseDioramaManifest(fallbackManifest())?.status).toBe("procedural-fallback");
  });

  it("accepts a bounded Thrixel GLB entry", () => {
    const manifest = fallbackManifest();
    manifest.status = "thrixel-assets";
    manifest.assets.guardian = {
      path: "/assets/gridwake/guardian.glb",
      source: "thrixel",
      bytes: 420_000,
      submissionId: "submission-1",
    };
    expect(parseDioramaManifest(manifest)?.assets.guardian?.bytes).toBe(420_000);
  });

  it("rejects external URLs and incomplete manifests", () => {
    const external = fallbackManifest();
    external.assets.guardian = {
      path: "https://api.thrixel.com/private.glb",
      source: "thrixel",
      bytes: 420_000,
      submissionId: "submission-1",
    };
    expect(parseDioramaManifest(external)).toBeNull();
    const incomplete = fallbackManifest();
    delete incomplete.assets.scout;
    expect(parseDioramaManifest(incomplete)).toBeNull();
  });
});
