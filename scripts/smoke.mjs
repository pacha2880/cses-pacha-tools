// Logged-in smoke test against live CSES, in the browser from `npm run browser`.
// Checks the toolbar, own solved marks, filter, view memory and the team layer with an existing CSES friend
// (looked up by name, so no friend is added). Usage: npm run smoke [-- out.png]
import { chromium } from "playwright";
import { CDP_PORT, reloadExtension } from "./browser.mjs";

const out = process.argv[2];
const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
await reloadExtension(browser);
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
  const ownSolved = Number((await stat()).match(/Solved:? (\d+)/)?.[1]);
  console.log(`Logged in as ${me.name}; ${solvedMarks} solved marks; stats "${await stat()}"`);
  if (ownSolved !== solvedMarks) fail(`stats say ${ownSolved} solved, page shows ${solvedMarks}`);

  // View switch is remembered across reloads; the filter hides own solved tasks.
  await page.getByRole("button", { name: "By solves" }).click();
  if (!(await page.locator("#pacha-cses-tools-ext-sorted").isVisible())) fail("By solves shows no list");
  await page.reload();
  await page.waitForSelector("#pacha-cses-tools-ext-bar");
  if ((await page.getByRole("button", { name: "By solves" }).getAttribute("aria-pressed")) !== "true") fail("view not remembered");
  await page.getByLabel("Filter").selectOption("me");
  const rows = await page.locator("#pacha-cses-tools-ext-sorted li.task").count();
  if (rows !== 400 - solvedMarks) fail(`Hide solved shows ${rows} rows, expected ${400 - solvedMarks}`);
  await page.getByLabel("Filter").selectOption("all");
  await page.getByRole("button", { name: "By topic" }).click();

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
    await input.press("Enter");
    await page.waitForSelector(".pacha-team .dot", { timeout: 15000 }).catch(() => fail(`team "${friend}" shows no dots`));
    if ((await page.locator("span.task-score.full").count()) !== solvedMarks) fail("team changed the user's own green checks");
    if (!/Me \d+ · Team \d+ · Nobody \d+/.test(await stat())) fail(`team stats missing: "${await stat()}"`);
    console.log(`Team "${friend}": stats "${await stat()}"`);
    if (out) await page.screenshot({ path: out });
    await page.locator("#pacha-cses-tools-ext-bar .clear").click();
    await page.waitForSelector(".pacha-team", { state: "detached", timeout: 5000 }).catch(() => fail("the × did not clear the team"));
    if (before) {
      await input.fill(before);
      await input.press("Enter");
    }
  }
  if (out && !friend) await page.screenshot({ path: out });
} catch (e) {
  fail(e.message);
} finally {
  await page.close();
  await browser.close();
}
