// Updates the Chrome Web Store listing (description from store/listing.md, screenshots from
// store/*.png) in the Developer Dashboard, through the browser from `npm run browser`, which
// must be signed in to Google. The dashboard locks the listing while a version is in review
// (`npm run release -- --cancel` first). The next release submits the listing with the package.
// Usage: node scripts/store-listing.mjs
import { chromium } from "playwright";
import { readdirSync, readFileSync } from "node:fs";
import { CDP_PORT } from "./browser.mjs";

const PUBLISHER = "7b7486b4-3c34-409e-a95e-c484ab8453f7";
const ITEM = "jjniilllmpgdakgffiilihbjchglpjjp";

const desc = readFileSync("store/listing.md", "utf8").replace(/\r\n/g, "\n").split("## Description\n")[1].trim();
const shots = readdirSync("store").filter(f => f.endsWith(".png")).sort().slice(0, 5).map(f => `store/${f}`);

const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
const page = await browser.contexts()[0].newPage();
try {
  await page.goto(`https://chrome.google.com/webstore/devconsole/${PUBLISHER}/${ITEM}/edit`);
  if (page.url().includes("accounts.google.com")) throw new Error("sign in to Google in the test browser first (start it without automation, see AGENTS.md)");
  const textarea = page.locator("textarea").first();
  await textarea.waitFor({ timeout: 90000 });
  if (await textarea.isDisabled()) throw new Error("the listing is locked while a version is in review: npm run release -- --cancel");

  await textarea.fill(desc);
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForTimeout(3000);

  // Replace the screenshots: the remove buttons appear on hover, each asks for confirmation.
  const removeButtons = () => page.getByRole("button", { name: /^Remove image Screenshot/ });
  await page.getByText("Screenshots", { exact: true }).first().scrollIntoViewIfNeeded();
  while (await removeButtons().count()) {
    const box = await removeButtons().first().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const ok = page.getByRole("button", { name: "Remove", exact: true });
    await ok.click();
    await ok.waitFor({ state: "hidden" });
  }
  const input = page.locator("input[type=file]").nth(1); // 0 is the store icon
  for (const [i, file] of shots.entries()) {
    await input.setInputFiles(file);
    await page.waitForFunction(n => document.querySelectorAll("[aria-label^='Remove image Screenshot']").length >= n, i + 1, { timeout: 30000 });
  }
  const save = page.getByRole("button", { name: "Save draft" });
  if (await save.isEnabled()) await save.click();
  await page.waitForTimeout(3000);

  await page.reload();
  await textarea.waitFor({ timeout: 90000 });
  const saved = (await textarea.inputValue()).trim() === desc && (await removeButtons().count()) === shots.length;
  console.log(saved ? `Listing saved: description + ${shots.length} screenshots.` : "Listing NOT saved as expected; check the dashboard.");
  if (!saved) process.exitCode = 1;
} finally {
  await page.close();
  await browser.close();
}
