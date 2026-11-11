// Builds data/users.txt ("username<TAB>id<TAB>solved" per line, best ranked first) from CSES's user ranking
// (/problemset/stats/p/<n>, 30 users per page, logged-in only), through the browser from
// `npm run browser`. Keeps users with at least MIN_SOLVED solved tasks. Polite: WORKERS requests at
// a time (the ranking pages are slow, ~2 s each), 30 s timeout, retries. Progress is kept in
// data/.users-partial.txt ("page<TAB>name<TAB>id<TAB>solved", pages in any order) so a run resumes.
// Usage: npm run users
import { chromium } from "playwright";
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { CDP_PORT } from "./browser.mjs";

const MIN_SOLVED = 5;
const WORKERS = 3;
const OUT = "data/users.txt";
const PARTIAL = "data/.users-partial.txt";

const read = () => (existsSync(PARTIAL) ? readFileSync(PARTIAL, "utf8").split("\n").filter(Boolean).map(l => l.split("\t")) : []);
const done = new Set(read().map(r => Number(r[0])));
// The last page to fetch: the first one with users below MIN_SOLVED (unknown until seen)
let lastPage = Infinity;
for (const r of read()) if (r.length > 3 && Number(r[3]) < MIN_SOLVED) lastPage = Math.min(lastPage, Number(r[0]));

const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
const page = await browser.contexts()[0].newPage();

async function fetchPage(n) {
  return page.evaluate(async n => {
    const res = await fetch(`/problemset/stats/p/${n}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`page ${n}: HTTP ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return [...doc.querySelectorAll("table tr")].flatMap(tr => {
      const a = tr.querySelector("a[href^='/problemset/user/']");
      const id = a?.getAttribute("href").match(/\/user\/(\d+)\//)?.[1];
      return id ? [[a.textContent.trim(), id, Number(tr.cells[2]?.textContent)]] : [];
    });
  }, n);
}

let next = 1, fetched = 0;
async function worker() {
  for (;;) {
    while (done.has(next)) next++;
    const n = next++;
    if (n > lastPage) return;
    let rows;
    for (let attempt = 1; ; attempt++) {
      try {
        rows = await fetchPage(n);
        break;
      } catch (e) {
        if (attempt >= 5) throw e;
        console.log(`page ${n}: ${e.message}, retry ${attempt}`);
        await page.waitForTimeout(5000 * attempt);
      }
    }
    if (!rows.length) throw new Error(`page ${n} has no users (logged out?)`);
    // Every row is kept, also the boundary page's low ones (they mark the end on resume); filtered below.
    appendFileSync(PARTIAL, rows.map(([name, id, solved]) => `${n}\t${name}\t${id}\t${solved}\n`).join(""));
    if (rows.at(-1)[2] < MIN_SOLVED) lastPage = Math.min(lastPage, n);
    if (++fetched % 100 === 0) console.log(`${fetched} pages this run; page ${n}: ${rows.at(-1)[2]} solved`);
  }
}

try {
  await page.goto("https://cses.fi/problemset/");
  await Promise.all(Array.from({ length: WORKERS }, worker));
  const rows = read().filter(r => r.length > 3 && Number(r[3]) >= MIN_SOLVED);
  rows.sort((a, b) => Number(b[3]) - Number(a[3]) || Number(a[0]) - Number(b[0])); // rank order
  const seen = new Set();
  const lines = rows.filter(r => !seen.has(r[2]) && seen.add(r[2])).map(r => r.slice(1).join("\t"));
  writeFileSync(OUT, lines.join("\n") + "\n");
  rmSync(PARTIAL);
  console.log(`${lines.length} users -> ${OUT}`);
} finally {
  await page.close();
  await browser.close();
}
