// Logged-in smoke test against live CSES, in the browser from `npm run browser`.
// Checks the toolbar, own solved marks, filter, view memory and the team layer with an existing CSES friend
// (picked from the suggestions, so no friend is added; the user's own team is put back). Usage: npm run smoke [-- out.png]
import { chromium } from "playwright";
import { CDP_PORT, reloadExtension } from "./browser.mjs";

const out = process.argv[2];
const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
await reloadExtension(browser);
const page = await browser.contexts()[0].newPage();
// CSES's own lists only (the By solves list holds clones of the same rows)
const OWN_MARKS = "ul.task-list:not(#pacha-cses-tools-ext-sorted) span.task-score.full";
const fail = msg => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };

try {
  await page.goto("https://cses.fi/problemset/");
  await page.waitForSelector("#pacha-cses-tools-ext-bar", { timeout: 10000 });
  const me = await page.evaluate(() => {
    const a = document.querySelector(".controls a.account[href*='/user/']");
    return a && { name: a.textContent.trim(), id: a.getAttribute("href").match(/\d+/)[0] };
  });
  if (!me) throw new Error("not logged in to CSES in the test browser (npm run browser, then log in)");

  const solvedMarks = await page.locator(OWN_MARKS).count();
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
    const a = [...doc.querySelectorAll("table a[href^='/user/']")].find(a => /^\/user\/\d+\/?$/.test(a.getAttribute("href")));
    return a && a.textContent.trim();
  }, me.id);
  if (!friend) {
    console.log("No CSES friends; skipping the team check.");
  } else {
    // Start from an empty team, keep the user's own to put back at the end
    const keys = ["team", "recent-mates", "recent-teams"].map(k => `pacha-cses-tools-ext-${k}`);
    const saved = await page.evaluate(keys => keys.map(k => localStorage.getItem(k)), keys);
    await page.evaluate(keys => keys.forEach(k => localStorage.removeItem(k)), keys);
    await page.reload();
    const input = page.locator("#pacha-cses-tools-ext-mates");
    await input.click();
    await input.fill(friend);
    await page.waitForSelector(".suggest .option", { timeout: 15000 }).catch(() => fail("no suggestions"));
    await input.press("Enter");
    await page.waitForSelector(".chip.ready", { timeout: 15000 }).catch(() => fail(`team "${friend}" never loaded`));
    await page.waitForSelector(".pacha-team .dot", { timeout: 5000 }).catch(() => fail(`team "${friend}" shows no dots`));
    if ((await page.locator(OWN_MARKS).count()) !== solvedMarks) fail("team changed the user's own green checks");
    if (!/Me \d+ · Team \d+ · Nobody \d+/.test(await stat())) fail(`team stats missing: "${await stat()}"`);
    console.log(`Team "${friend}": stats "${await stat()}"`);
    if (out) await page.screenshot({ path: out });
    await page.locator(".chip .toggle").first().click();
    await page.waitForSelector(".pacha-team", { state: "detached", timeout: 5000 }).catch(() => fail("hiding the only teammate left their dots"));
    await page.locator(".chip .remove").first().click();
    await page.waitForSelector(".pacha-team", { state: "detached", timeout: 5000 }).catch(() => fail("× did not remove the teammate"));
    await page.evaluate(([keys, saved]) => keys.forEach((k, i) => (saved[i] == null ? localStorage.removeItem(k) : localStorage.setItem(k, saved[i]))), [keys, saved]);
  }
  if (out && !friend) await page.screenshot({ path: out });
} catch (e) {
  fail(e.message);
} finally {
  await page.close();
  await browser.close();
}
