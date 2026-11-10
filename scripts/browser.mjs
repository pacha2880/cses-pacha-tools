// Opens Chrome for Testing with this folder loaded as an unpacked extension and a
// persistent profile (~/.cses-pacha-profile), so a CSES login survives restarts.
// Exposes CDP on port 9333 so other scripts can attach (see scripts/smoke.mjs).
// Install the browser once: npx @puppeteer/browsers install chrome@stable --path ~/.cft
// Usage: npm run browser [-- url]
import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const PROFILE = process.env.PACHA_PROFILE ?? join(homedir(), ".cses-pacha-profile");
export const CDP_PORT = 9333;

// Branded Chrome ignores --load-extension, so use Chrome for Testing (or CHROME_PATH).
export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const dir = join(homedir(), ".cft", "chrome");
  const builds = existsSync(dir) ? readdirSync(dir).sort() : [];
  const exe = builds.length && join(dir, builds.at(-1), "chrome-win64", "chrome.exe");
  if (!exe || !existsSync(exe)) throw new Error("Chrome for Testing not found; see the header of scripts/browser.mjs");
  return exe;
}

// CSES's login is a session cookie; "continue where you left off" keeps it across restarts.
function keepSessionCookies() {
  const file = join(PROFILE, "Default", "Preferences");
  const prefs = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  prefs.session = { ...prefs.session, restore_on_startup: 1 };
  mkdirSync(join(PROFILE, "Default"), { recursive: true });
  writeFileSync(file, JSON.stringify(prefs));
}

// Reloads the unpacked extension in a running browser (after editing src/), without a restart.
export async function reloadExtension(browser) {
  const page = await browser.contexts()[0].newPage();
  await page.goto("chrome://extensions");
  await page.evaluate(async () => {
    const infos = await chrome.developerPrivate.getExtensionsInfo();
    for (const e of infos.filter(e => e.location === "UNPACKED")) await chrome.developerPrivate.reload(e.id, { failQuietly: true });
  });
  await page.close();
}

export async function launch({ headless = false } = {}) {
  keepSessionCookies();
  const ext = resolve(".");
  return chromium.launchPersistentContext(PROFILE, {
    executablePath: chromePath(),
    headless,
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, `--remote-debugging-port=${CDP_PORT}`],
  });
}

if (import.meta.url === `file:///${process.argv[1].replaceAll("\\", "/")}`) {
  const ctx = await launch();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(process.argv[2] ?? "https://cses.fi/problemset/");
  console.log(`Browser open (profile ${PROFILE}, CDP http://localhost:${CDP_PORT}). Close the window to exit.`);
  await new Promise(r => ctx.on("close", r));
}
