// Takes the Chrome Web Store screenshots (exactly 1280x800) into store/, logged in, in both
// CSES themes, using the browser from `npm run browser`, in a new tab. The demo team is three
// public users from the CSES ranking (never the user's friends); the user's team, saved teams,
// view, filter and theme are put back afterwards.
// Usage: node scripts/store-shots.mjs
import { chromium } from "playwright";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { CDP_PORT, reloadExtension } from "./browser.mjs";

const DEMO_TEAM = [
  { id: "331457", label: "Octagons" },
  { id: "81950", label: "Comet_Honeymoon" },
  { id: "31815", label: "dalex" },
];
const SHOTS = [
  { file: "1-team-by-solves-light.png", dark: false, view: "By solves", filter: "all" },
  { file: "2-suggestions-dark.png", dark: true, view: "By topic", filter: "all", type: "ali" },
  { file: "3-only-team-dark.png", dark: true, view: "By solves", filter: "team" },
  { file: "4-by-topic-light.png", dark: false, view: "By topic", filter: "me" },
];
const KEYS = ["team", "saved-teams", "recent-teams", "recent-mates", "view", "filter"].map(k => `pacha-cses-tools-ext-${k}`);

const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
await reloadExtension(browser);
const page = await browser.contexts()[0].newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const isDark = () => page.evaluate(() => JSON.parse(document.getElementById("darkmode-enabled").textContent));
const setTheme = async dark => {
  if ((await isDark()) !== dark) {
    await page.evaluate(() => toggle_theme());
    await page.waitForTimeout(800);
  }
};

await page.goto("https://cses.fi/problemset/");
if (!(await page.locator(".controls a.account[href*='/user/']").count())) throw new Error("log in to CSES in the test browser first");
const originalTheme = await isDark();
const backup = await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), KEYS);

try {
  // Demo state: the team, starred
  await page.evaluate(team => {
    localStorage.setItem("pacha-cses-tools-ext-team", JSON.stringify(team.map((u, slot) => ({ ...u, slot, hidden: false }))));
    localStorage.setItem("pacha-cses-tools-ext-saved-teams", JSON.stringify([team]));
  }, DEMO_TEAM);

  mkdirSync("store", { recursive: true });
  for (const f of readdirSync("store").filter(f => f.endsWith(".png"))) rmSync(`store/${f}`);
  for (const s of SHOTS) {
    await page.goto("https://cses.fi/problemset/");
    await setTheme(s.dark);
    await page.waitForSelector("#pacha-cses-tools-ext-bar");
    await page.waitForFunction(n => document.querySelectorAll(".chip.ready").length === n, DEMO_TEAM.length, { timeout: 20000 });
    await page.getByRole("button", { name: s.view }).click();
    await page.getByLabel("Filter").selectOption(s.filter);
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    if (s.type) {
      await page.locator(`#pacha-cses-tools-ext-mates`).click();
      await page.locator(`#pacha-cses-tools-ext-mates`).fill(s.type);
      await page.waitForSelector(".suggest .option");
      await page.mouse.move(0, 0);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: `store/${s.file}`, scale: "css" });
    console.log(`store/${s.file}`);
    if (s.type) await page.locator(`#pacha-cses-tools-ext-mates`).fill("");
  }
} finally {
  // Leave the user's settings as they were (reload first so nothing re-saves the demo team).
  await page.goto("about:blank");
  await page.goto("https://cses.fi/problemset/");
  await page.evaluate(([keys, backup]) => keys.forEach((k, i) => (backup[i] == null ? localStorage.removeItem(k) : localStorage.setItem(k, backup[i]))), [KEYS, backup]);
  await setTheme(originalTheme);
  await page.close();
  await browser.close();
}
