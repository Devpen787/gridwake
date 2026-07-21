const { createRequire } = require("module");
const projectRequire = createRequire(require("path").join(__dirname, "..", "package.json"));
const { chromium } = projectRequire("playwright");
const SCRATCH = require("path").join(__dirname, "out");
const QA = SCRATCH;
require("fs").mkdirSync(SCRATCH, { recursive: true });

const SENTENCE = "Guard the core in a tight disciplined ring. Send two units within 25% and do not chase. Pulse below 45% health.";

(async () => {
  const started = Date.now();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: `${SCRATCH}/video`, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const mark = (label) => console.log(`${((Date.now() - started) / 1000).toFixed(1)}s  ${label}`);

  await page.goto("https://gridwake.vercel.app");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=GRIDWAKE");

  // Caption bar baked into the recording, styled to match the game.
  await page.evaluate(() => {
    const bar = document.createElement("div");
    bar.id = "__demo_caption";
    bar.style.cssText = [
      "position:fixed", "left:50%", "bottom:4%", "transform:translateX(-50%)",
      "max-width:72%", "padding:16px 30px", "z-index:999999", "pointer-events:none",
      "background:rgba(3,6,10,0.92)", "border:1px solid rgba(64,232,255,0.55)",
      "box-shadow:0 0 40px rgba(64,232,255,0.15)",
      "color:#f4f7ff", "font-family:'IBM Plex Mono',monospace", "font-size:21px",
      "letter-spacing:0.08em", "text-align:center", "line-height:1.5",
      "opacity:0", "transition:opacity 0.35s ease",
    ].join(";");
    document.body.appendChild(bar);
  });
  const caption = (text) => page.evaluate((value) => {
    const bar = document.getElementById("__demo_caption");
    if (!bar) return;
    if (!value) { bar.style.opacity = "0"; return; }
    bar.textContent = value;
    bar.style.opacity = "1";
  }, text);

  // ── 1. Landing (0:00–0:07)
  await caption("Every game gives you buttons. This one gives you words.");
  mark("landing");
  await page.waitForTimeout(6200);

  // ── 2. Campaign ladder (0:07–0:15)
  await page.click("text=CAMPAIGN");
  await page.waitForSelector("text=GRID LADDER");
  await caption("Eight grids. Fixed seeds. Hold one to unlock the next \u2014 beat par for stars.");
  mark("ladder");
  await page.waitForTimeout(7200);

  // ── 3. Level briefing + typed sentence (0:15–0:28)
  await page.click("text=FIRST LIGHT");
  await page.waitForSelector("text=STRATEGY LABORATORY");
  await caption("The grid tells you what\u2019s coming. You tell your squad how to survive it.");
  mark("lab");
  await page.waitForTimeout(3800);
  await caption("Just write it down\u2026");
  await page.click("#strategy");
  await page.keyboard.type(SENTENCE, { delay: 34 });
  mark("typed");
  await page.waitForTimeout(700);

  // ── 4. Compiled plan (0:28–0:39)
  await caption("Before anything moves, it shows you what it heard.");
  await page.screenshot({ path: `${QA}/demo-beat-plan.png` });
  await page.waitForTimeout(5600);
  await page.click("text=HOW IT READ YOUR WORDS");
  await caption("Every word accounted for. Nothing hidden. Nothing phoned home.");
  mark("evidence");
  await page.waitForTimeout(5200);

  // ── 5. Wake (0:39–0:41)
  await caption("Wake them.");
  await page.click(".strategy-lab__wake .primary-action");
  mark("wake");

  // ── 6. The round (~45s)
  await page.waitForSelector("text=CORE HEALTH", { timeout: 30000 });
  mark("round-start");
  await page.waitForTimeout(1500);
  await caption("45 seconds. The corruption doesn\u2019t wait.");
  await page.waitForTimeout(6500);
  await caption("Your words are out there fighting \u2014 a tight ring, two hunters, nobody chases.");
  await page.waitForTimeout(7000);
  await caption("When it gets personal, step in yourself. Six seconds at a time.");
  await page.keyboard.press("2");
  await page.waitForTimeout(500);
  for (const key of ["w", "a", "w", "a", "s", "d", "w", "a"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(420);
  }
  await page.keyboard.press("Escape");
  mark("possession-done");
  await page.screenshot({ path: `${QA}/demo-beat-possess.png` });
  await page.waitForTimeout(3000);
  await caption("It gets worse. It always gets worse.");
  await page.waitForTimeout(7000);
  await caption("One Pulse. Your words already chose where it lands.");
  await page.waitForTimeout(3400);
  await page.keyboard.press(" ");
  mark("pulse");
  await page.waitForTimeout(4500);
  await caption("Hold on.");

  // ── 7. Result
  await page.waitForSelector("text=/THE GRID HELD|THE CORE WENT DARK/", { timeout: 90000 });
  mark("result");
  await page.waitForTimeout(1200);
  await caption("When the dust settles, every choice you wrote gets graded.");
  await page.screenshot({ path: `${QA}/demo-beat-result.png` });
  await page.waitForTimeout(7500);

  // ── 8. Ladder with progress + outro
  await page.click("text=GRID LADDER");
  await page.waitForSelector("text=GRID LADDER");
  await caption("Your story stacks up \u2014 stars, streaks, ranks, personal bests.");
  mark("outro-ladder");
  await page.waitForTimeout(6000);
  await caption("GRIDWAKE \u2014 say what you mean. Watch it fight. \u00b7 gridwake.vercel.app");
  await page.screenshot({ path: `${QA}/demo-beat-outro.png` });
  await page.waitForTimeout(6500);
  await caption(null);
  await page.waitForTimeout(900);

  mark("end");
  const video = page.video();
  await context.close();
  const path = await video.path();
  console.log("VIDEO:", path);
  await browser.close();
})();
