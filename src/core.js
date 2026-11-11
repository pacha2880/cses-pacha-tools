// Shared constants, state, DOM helpers, fetching and page scraping.

const ID = "pacha-cses-tools-ext";
const STORAGE_KEYS = {
  hideSolved: `${ID}-hideSolved`, // legacy, migrated to `filter`
  filter: `${ID}-filter`,
  view: `${ID}-view`,
  mates: `${ID}-team-mates`, // legacy comma-separated string, migrated to `team`
  team: `${ID}-team`, // JSON [{ id, label, slot, hidden }]
  recentTeams: `${ID}-recent-teams`, // JSON [[{ id, label }]], newest first
  recentMates: `${ID}-recent-mates`, // JSON [{ id, label }], newest first
  friends: `${ID}-friends`, // JSON { me, t, counts: { id: solved } }, cached friends ranking
  friendConsent: `${ID}-friend-consent`,
};

const state = {
  mode: localStorage.getItem(STORAGE_KEYS.view) === "sorted" ? "sorted" : "original", // "original" | "sorted"
  filter: localStorage.getItem(STORAGE_KEYS.filter) ?? (localStorage.getItem(STORAGE_KEYS.hideSolved) === "1" ? "me" : "all"),
  // Teammates in chip order: { id, label, slot, hidden, status: "loading" | "ready" | "error", set, solved }.
  // `slot` (0-5, -1 = none) fixes the teammate's color and is kept while they stay on the team.
  team: [],
  data: [], // one row per task, built by extractAll()
};

// Which tasks are shown. Keys are stored in localStorage.
const FILTERS = {
  all: "Show all",
  me: "Hide solved by me",
  anyone: "Hide solved by anyone",
  team: "Only solved by team, not by me",
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
        solved, // by the logged-in user (CSES's own green check; never changed)
        solvedBy: new Set(), // slots of the shown teammates who solved it (recomputeSolvedBy in team.js)
        solvedCount,
        totalCount,
      });
    }
  }
  return result;
}

// The single place that decides whether a task row is shown (both views + stats)
function isVisible(row) {
  const team = row.solvedBy.size > 0;
  switch (state.filter) {
    case "me": return !row.solved;
    case "anyone": return !row.solved && !team;
    case "team": return !row.solved && team;
    default: return true;
  }
}
