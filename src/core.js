// Shared constants, state, DOM helpers, fetching and page scraping.

const ID = "pacha-cses-tools-ext";
const STORAGE_KEYS = {
  hideSolved: `${ID}-hideSolved`,
  mates: `${ID}-team-mates`,
};

const state = {
  mode: "original", // "original" | "sorted"
  hideSolved: localStorage.getItem(STORAGE_KEYS.hideSolved) === "1",
  data: [], // one row per task, built by extractAll()
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function taskIdFromUrl(href) {
  const m = (href || "").match(/\/problemset\/task\/(\d+)/);
  return m ? m[1] : null;
}

function userIdFromUrl(href) {
  return (href || "").match(/\/user\/(\d+)/)?.[1] ?? null;
}

// GETs a same-origin page and parses it; null on non-2xx
async function fetchDoc(url) {
  const resp = await fetch(url, { credentials: "same-origin" });
  if (!resp.ok) return null;
  const html = await resp.text();
  return new DOMParser().parseFromString(html, "text/html");
}

// "123 / 456" -> [123, 456]
function parseDetailCounts(text) {
  const m = (text || "").match(/(\d+)\s*\/\s*(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
}

// Reads every <h2> + <ul.task-list> section of the problemset page
function extractAll() {
  const result = [];
  for (const h2 of $$("h2")) {
    const topic = h2.textContent.trim();
    const ul = h2.nextElementSibling;
    if (!ul || !ul.classList.contains("task-list")) continue;

    for (const li of $$("li.task", ul)) {
      const a = $("a[href]", li);
      if (!a) continue;
      const detail = $("span.detail", li);
      const score = $("span.task-score", li);
      const solved = !!(score && score.classList.contains("full"));
      const [solvedCount, totalCount] = parseDetailCounts(detail ? detail.textContent : "");

      result.push({
        li,
        topic,
        title: (a.textContent || "").trim(),
        url: a.href || new URL(a.getAttribute("href"), location.origin).href,
        taskId: taskIdFromUrl(a.getAttribute("href")),
        solved, // what the UI shows; team painting overrides it
        baseSolved: solved, // the user's own status
        solvedCount,
        totalCount,
      });
    }
  }
  return result;
}

// The single place that decides whether a task row is shown (both views + stats)
function isVisible(row) {
  return !(state.hideSolved && row.solved);
}
