// Attaches to the browser from `npm run browser` and screenshots a CSES page with the extension.
// Usage: node scripts/shot.mjs <out.png> [url] [--dark|--light]
import { chromium } from "playwright";
import { CDP_PORT, reloadExtension } from "./browser.mjs";

const [out = "shot.png", url = "https://cses.fi/problemset/", theme] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
await reloadExtension(browser);
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().startsWith("https://cses.fi")) ?? (await ctx.newPage());
await page.goto(url);
if (theme) {
  // CSES keeps its own theme (stored in the account); toggle_theme() is its header link's handler.
  const dark = await page.evaluate(() => JSON.parse(document.getElementById("darkmode-enabled").textContent));
  if (dark !== (theme === "--dark")) {
    await page.evaluate(() => toggle_theme());
    await page.waitForTimeout(800);
  }
}
await page.waitForSelector("#pacha-cses-tools-ext-bar", { timeout: 10000 });
const info = await page.evaluate(() => ({
  loggedIn: !!document.querySelector(".controls a.account[href*='/user/']"),
  bar: document.querySelector("#pacha-cses-tools-ext-bar")?.innerText,
}));
console.log(JSON.stringify(info));
await page.screenshot({ path: out });
await browser.close();
