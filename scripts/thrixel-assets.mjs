import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const API_BASE = "https://api.thrixel.com/api/v1";
const ROOT = process.cwd();
const SOURCE_PATH = join(ROOT, "assets/thrixel/source-manifest.json");
const RUNTIME_PATH = join(ROOT, "public/assets/gridwake/manifest.json");
const JOBS_PATH = join(ROOT, ".thrixel/jobs.json");
const OUTPUT_DIR = join(ROOT, "public/assets/gridwake");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readJsonOr(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

function selectedAssets(source, selector) {
  if (selector === "all") return source.assets;
  const ids = selector === "pilot" ? source.pilot : [selector];
  const selected = ids.map((id) => source.assets.find((asset) => asset.id === id));
  const missing = ids.filter((_, index) => !selected[index]);
  if (missing.length > 0) throw new Error(`Unknown asset: ${missing.join(", ")}`);
  return selected;
}

function verifyGlb(bytes, asset) {
  if (bytes.byteLength < 20) throw new Error(`${asset.id}: GLB is too small`);
  if (bytes.subarray(0, 4).toString("utf8") !== "glTF") {
    throw new Error(`${asset.id}: file is not a GLB`);
  }
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`${asset.id}: GLB must be version 2`);
  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(`${asset.id}: GLB length header ${declaredLength} does not match ${bytes.byteLength}`);
  }
  if (bytes.byteLength > asset.maxBytes) {
    throw new Error(`${asset.id}: ${bytes.byteLength} bytes exceeds ${asset.maxBytes} byte budget`);
  }
}

async function streamUntilTerminal(submissionId) {
  const response = await fetch(`${API_BASE}/${submissionId}/stream`);
  if (!response.ok || !response.body) throw new Error(`Progress stream failed (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let terminal = null;

  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = pending.split(/\r?\n\r?\n/);
    pending = frames.pop() ?? "";
    for (const frame of frames) {
      const payload = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!payload) continue;
      const event = JSON.parse(payload);
      if (event.type === "progress" && typeof event.percent === "number") {
        process.stdout.write(`  ${Math.round(event.percent * 100)}% ${event.message ?? ""}\n`);
      }
      if (event.type === "status" && ["completed", "failed"].includes(event.status)) {
        terminal = event.status;
      }
    }
    if (done) break;
  }
  if (pending.trim()) {
    const payload = pending
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (payload) {
      const event = JSON.parse(payload);
      if (event.type === "status" && ["completed", "failed"].includes(event.status)) {
        terminal = event.status;
      }
    }
  }
  if (terminal !== "completed") throw new Error(`Generation ended with status ${terminal ?? "unknown"}`);
}

async function downloadAsset(submissionId, asset, runtime) {
  const response = await fetch(`${API_BASE}/${submissionId}/download?format=glb`);
  if (!response.ok) throw new Error(`${asset.id}: download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyGlb(bytes, asset);
  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, `${asset.id}.glb`);
  await writeFile(outputPath, bytes);

  runtime.assets[asset.id] = {
    path: `/assets/gridwake/${asset.id}.glb`,
    source: "thrixel",
    bytes: bytes.byteLength,
    submissionId
  };
  runtime.status = "thrixel-assets";
  runtime.generatedAt = new Date().toISOString();
  runtime.attribution = {
    label: "Selected 3D assets generated with Thrixel",
    url: "https://www.thrixel.com/",
    license: "CC BY 4.0"
  };
  await writeJsonAtomic(RUNTIME_PATH, runtime);
  process.stdout.write(`  saved ${outputPath} (${bytes.byteLength} bytes)\n`);
}

async function generate(selector) {
  const key = process.env.THRIXEL_API_KEY?.trim();
  if (!key) {
    throw new Error("THRIXEL_API_KEY is missing. Store it in .env.local; never use a VITE_ prefix.");
  }
  const source = await readJson(SOURCE_PATH);
  const runtime = await readJson(RUNTIME_PATH);
  const jobs = await readJsonOr(JOBS_PATH, { version: 1, jobs: {} });
  const assets = selectedAssets(source, selector);

  for (const asset of assets) {
    process.stdout.write(`Generating ${asset.id}\n`);
    let submissionId = jobs.jobs[asset.id]?.submissionId;
    if (!submissionId || jobs.jobs[asset.id]?.status === "failed") {
      const response = await fetch(`${API_BASE}/architect/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          task: `${source.sharedDirection}\n\nOBJECT: ${asset.prompt}`,
          adaptive_thinking: true,
          effort: "high"
        })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`${asset.id}: submit failed (${response.status}) ${detail.slice(0, 240)}`);
      }
      const submission = await response.json();
      submissionId = submission.submission_id;
      jobs.jobs[asset.id] = {
        submissionId,
        status: submission.status,
        submittedAt: new Date().toISOString()
      };
      await writeJsonAtomic(JOBS_PATH, jobs);
    } else {
      process.stdout.write(`  resuming ${submissionId}\n`);
    }
    await streamUntilTerminal(submissionId);
    jobs.jobs[asset.id].status = "completed";
    await writeJsonAtomic(JOBS_PATH, jobs);
    await downloadAsset(submissionId, asset, runtime);
  }
}

async function validate() {
  const source = await readJson(SOURCE_PATH);
  const runtime = await readJson(RUNTIME_PATH);
  let count = 0;
  for (const asset of source.assets) {
    const entry = runtime.assets[asset.id];
    if (!entry?.path) continue;
    const bytes = await readFile(resolve(ROOT, `public${entry.path}`));
    verifyGlb(bytes, asset);
    count += 1;
  }
  process.stdout.write(`Validated ${count} GLB asset${count === 1 ? "" : "s"}; procedural fallback remains available.\n`);
}

const command = process.argv[2] ?? "validate";
const selector = process.argv[3] ?? "pilot";

try {
  if (command === "generate") await generate(selector);
  else if (command === "validate") await validate();
  else throw new Error(`Usage: thrixel-assets.mjs generate [pilot|all|asset-id] | validate`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
