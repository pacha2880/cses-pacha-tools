// Takes the Chrome Web Store screenshots (exactly 1280x800) into store/, logged in, in both
// CSES themes, using the browser from `npm run browser`. Restores the CSES theme afterwards.
// Usage: node scripts/store-shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { CDP_PORT, reloadExtension } from "./browser.mjs";

const SHOTS = [
  { file: "1-by-topic-light.png", dark: false, view: "By topic", filter: "all" },
  { file: "2-by-solves-dark.png", dark: true, view: "By solves", filter: "all" },
  { file: "3-hide-solved-light.png", dark: false, view: "By solves", filter: "me" },
  { file: "4-hide-solved-dark.png", dark: true, view: "By topic", filter: "me" },
];

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

mkdirSync("store", { recursive: true });
await page.goto("https://cses.fi/problemset/");
const originalTheme = await isDark();
if (!(await page.locator(".controls a.account[href*='/user/']").count())) throw new Error("log in to CSES in the test browser first");

for (const s of SHOTS) {
  await page.goto("https://cses.fi/problemset/");
  await setTheme(s.dark);
  await page.waitForSelector("#pacha-cses-tools-ext-bar");
  await page.getByRole("button", { name: s.view }).click();
  await page.getByLabel("Filter").selectOption(s.filter);
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: `store/${s.file}`, scale: "css" });
  console.log(`store/${s.file}`);
}

// Leave the user's settings as they were.
await page.getByLabel("Filter").selectOption("all");
await page.getByRole("button", { name: "By topic" }).click();
await setTheme(originalTheme);
await page.close();
await browser.close();
