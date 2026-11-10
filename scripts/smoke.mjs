// Logged-in smoke test against live CSES, in the browser from `npm run browser`.
// Checks the toolbar, own solved marks, and team painting with an existing CSES friend
// (looked up by name, so no friend is added). Usage: npm run smoke [-- out.png]
import { chromium } from "playwright";
import { CDP_PORT } from "./browser.mjs";

const out = process.argv[2];
const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
const page = await browser.contexts()[0].newPage();
const fail = msg => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };

try {
  await page.goto("https://cses.fi/problemset/");
  await page.waitForSelector("#pacha-cses-tools-ext-bar", { timeout: 10000 });
  const me = await page.evaluate(() => {
    const a = document.querySelector(".controls a.account[href*='/user/']");
    return a && { name: a.textContent.trim(), id: a.getAttribute("href").match(/\d+/)[0] };
  });
  if (!me) throw new Error("not logged in to CSES in the test browser (npm run browser, then log in)");

  const solvedMarks = await page.locator("span.task-score.full").count();
  const stat = () => page.locator("#pacha-cses-tools-ext-bar .stat").innerText();
  const ownSolved = Number((await stat()).match(/Solved: (\d+)/)?.[1]);
  console.log(`Logged in as ${me.name}; ${solvedMarks} solved marks; stats "${await stat()}"`);
  if (ownSolved !== solvedMarks) fail(`stats say ${ownSolved} solved, page shows ${solvedMarks}`);

  const friend = await page.evaluate(async id => {
    const doc = new DOMParser().parseFromString(await (await fetch(`/user/${id}/friends/`)).text(), "text/html");
    const a = doc.querySelector("table a[href^='/user/']");
    return a && a.textContent.trim();
  }, me.id);
  if (!friend) {
    console.log("No CSES friends; skipping the team check.");
  } else {
    const input = page.locator("#pacha-cses-tools-ext-bar input[type=text], #pacha-cses-tools-ext-bar input:not([type])").first();
    const before = await input.inputValue();
    await input.fill(friend);
    await page.getByRole("button", { name: /paint|apply/i }).click();
    await page.waitForFunction(n => document.querySelectorAll("span.task-score.full").length > n || document.querySelector("[data-pacha-painted], .pacha-dot"), solvedMarks, { timeout: 15000 })
      .catch(() => fail(`painting team "${friend}" changed nothing`));
    console.log(`Team "${friend}": stats "${await stat()}"`);
    if (out) await page.screenshot({ path: out });
    await input.fill(before);
    await page.getByRole("button", { name: /paint|apply/i }).click();
  }
  if (out && !friend) await page.screenshot({ path: out });
} catch (e) {
  fail(e.message);
} finally {
  await page.close();
  await browser.close();
}
