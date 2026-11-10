// Attaches to the browser from `npm run browser` and screenshots a CSES page with the extension.
// Usage: node scripts/shot.mjs <out.png> [url] [--dark|--light]
import { chromium } from "playwright";
import { CDP_PORT } from "./browser.mjs";

const [out = "shot.png", url = "https://cses.fi/problemset/", theme] = process.argv.slice(2);
const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().startsWith("https://cses.fi")) ?? (await ctx.newPage());
await page.goto(url);
if (theme) {
  // CSES keeps its own theme; its header link toggles it.
  const dark = await page.evaluate(() => !!document.querySelector("#darkmode-enabled")?.checked);
  if (dark !== (theme === "--dark")) {
    await page.click("a[href*='darkmode'], #theme-toggle, .controls a[title*='mode']").catch(() => {});
    await page.waitForLoadState();
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
