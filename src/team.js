// "Paint team": marks as solved every task solved by any of the given teammates.
// UI feedback goes through teamMessage() / teamProgress() / setTeamBusy() from ui.js.

const myUserId = () => userIdFromUrl($(".controls a.account[href*='/user/']")?.getAttribute("href"));

// Set of taskIds fully solved by a user, scraped from /problemset/user/<id>/; null if that
// page has no statistics (unknown id, or logged out).
async function fetchSolvedSet(userId) {
  const doc = await fetchDoc(`/problemset/user/${encodeURIComponent(userId)}/`);
  if (!doc || !$("table.course-user-solved", doc)) return null;
  const set = new Set();
  for (const a of $$('table.course-user-solved a.task-score.icon.full[href*="/problemset/task/"]', doc)) {
    const id = taskIdFromUrl(a.getAttribute("href"));
    if (id) set.add(id);
  }
  return set;
}

// name (lowercase) -> user id, from the logged-in user's CSES friends page
function friendsFrom(doc) {
  const map = new Map();
  for (const a of $$("table a[href^='/user/']", doc)) map.set(a.textContent.trim().toLowerCase(), userIdFromUrl(a.getAttribute("href")));
  return map;
}

// Adds `names` as CSES friends of the logged-in user (the only way to look up a username's id).
async function addFriends(friendsUrl, doc, names) {
  for (const name of names) {
    const token = $("input[name='csrf_token']", doc)?.value;
    if (!token) return;
    await fetch(friendsUrl, {
      method: "POST",
      body: new URLSearchParams({ csrf_token: token, add: name }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    doc = (await fetchDoc(friendsUrl)) ?? doc;
  }
}

// Resolves numeric ids and usernames to user ids. Usernames that are not CSES friends yet
// are added as friends, after asking the user once. Returns { ids, notFound } or null if cancelled.
async function resolveTeam(entries) {
  const ids = [], notFound = [];
  const names = entries.filter(e => !/^\d+$/.test(e));
  ids.push(...entries.filter(e => /^\d+$/.test(e)));
  if (!names.length) return { ids, notFound };

  const friendsUrl = `/user/${myUserId()}/friends/`;
  let doc = await fetchDoc(friendsUrl);
  if (!doc) return { ids, notFound: notFound.concat(names) };
  let friends = friendsFrom(doc);

  const missing = names.filter(n => !friends.has(n.toLowerCase()));
  if (missing.length) {
    if (localStorage.getItem(STORAGE_KEYS.friendConsent) !== "1") {
      const ok = await askTeam(
        `Usernames are looked up through your CSES friends list. Add ${missing.join(", ")} as ${missing.length > 1 ? "friends" : "a friend"}?`,
        missing.length > 1 ? "Add as friends" : "Add as friend",
      );
      if (!ok) return null;
      localStorage.setItem(STORAGE_KEYS.friendConsent, "1");
    }
    await addFriends(friendsUrl, doc, missing);
    doc = await fetchDoc(friendsUrl);
    if (doc) friends = friendsFrom(doc);
  }
  for (const n of names) {
    const id = friends.get(n.toLowerCase());
    if (id) ids.push(id);
    else notFound.push(n);
  }
  return { ids, notFound };
}

// Makes sure the <li> has a span.task-score (CSES omits it for untouched tasks)
function ensureScoreSpan(li) {
  let score = $("span.task-score", li);
  if (!score) {
    score = document.createElement("span");
    score.className = "task-score icon";
    li.appendChild(document.createTextNode(" "));
    li.appendChild(score);
  } else {
    score.classList.add("icon");
  }
  return score;
}

// Marks tasks in `solvedIds` as full, both in the DOM and in state.data.
// Spans we turn "full" get data-pacha-painted="1" so clearTeamPaint() can undo them.
function paintTeam(solvedIds) {
  for (const row of state.data) {
    const score = ensureScoreSpan(row.li);
    if (!solvedIds.has(row.taskId)) continue;

    if (!score.classList.contains("full")) {
      score.classList.add("full");
      score.setAttribute("data-pacha-painted", "1");
    }
    row.solved = true;
  }
}

// Undoes paintTeam(): DOM spans and state.data back to the user's own state
function clearTeamPaint() {
  for (const span of $$('span.task-score[data-pacha-painted="1"]')) {
    span.classList.remove("full");
    span.removeAttribute("data-pacha-painted");
  }
  for (const row of state.data) row.solved = row.baseSolved;
}

// `raw` is the comma-separated input; an empty one clears the team.
async function runTeamPaint(raw) {
  const entries = [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
  teamMessage("");
  if (!entries.length) {
    clearTeamPaint();
    return refresh();
  }
  if (!myUserId()) return teamMessage("Log in to CSES to use Team.", "error");

  setTeamBusy(true);
  try {
    teamProgress("Looking up teammates…");
    const team = await resolveTeam(entries);
    if (!team) return teamMessage("");

    const sets = [];
    for (const [i, id] of team.ids.entries()) {
      teamProgress(`Loading ${i + 1}/${team.ids.length}…`);
      const set = await fetchSolvedSet(id);
      if (set) sets.push(set);
      else team.notFound.push(id);
    }

    clearTeamPaint();
    paintTeam(new Set(sets.flatMap(s => [...s])));
    refresh();
    const found = `Team: ${sets.length} ${sets.length === 1 ? "teammate" : "teammates"}`;
    if (team.notFound.length) teamMessage(`${found}. Not found: ${team.notFound.join(", ")}`, "error");
    else teamMessage(found);
  } catch (e) {
    console.error(e);
    teamMessage("Couldn't load the team from CSES. Try again.", "error");
    refresh();
  } finally {
    setTeamBusy(false);
  }
}
