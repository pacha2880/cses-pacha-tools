// Team: which of the given teammates solved each task, kept apart from the user's own
// status (row.solvedBy next to row.solved; CSES's green check is never touched).
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
  // Only profile links (/user/<id>/), not the "remove" links (/user/<me>/friends/remove/<id>)
  for (const a of $$("table a[href^='/user/']", doc).filter(a => /^\/user\/\d+\/?$/.test(a.getAttribute("href")))) map.set(a.textContent.trim().toLowerCase(), userIdFromUrl(a.getAttribute("href")));
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

// Resolves numeric ids and usernames to { id, label }. Usernames that are not CSES friends yet
// are added as friends, after asking the user once. Returns { ids, notFound } or null if cancelled.
async function resolveTeam(entries) {
  const ids = [], notFound = [];
  const names = entries.filter(e => !/^\d+$/.test(e));
  ids.push(...entries.filter(e => /^\d+$/.test(e)).map(id => ({ id, label: id })));
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
    if (id) ids.push({ id, label: n });
    else notFound.push(n);
  }
  return { ids, notFound };
}


// Records the team and, for every task, which of its members solved it
function setTeam(members, sets) {
  state.team = members;
  for (const row of state.data) {
    row.solvedBy = new Set(sets.flatMap((set, i) => (set.has(row.taskId) ? [i] : [])));
  }
}

// `raw` is the comma-separated input; an empty one clears the team.
async function runTeam(raw) {
  const entries = [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
  teamMessage("");
  if (!entries.length) {
    setTeam([], []);
    return refresh();
  }
  if (!myUserId()) return teamMessage("Log in to CSES to use Team.", "error");

  setTeamBusy(true);
  try {
    teamProgress("Looking up teammates…");
    const team = await resolveTeam(entries);
    if (!team) return teamMessage("");

    const members = [], sets = [];
    for (const [i, m] of team.ids.entries()) {
      teamProgress(`Loading ${i + 1}/${team.ids.length}…`);
      const set = await fetchSolvedSet(m.id);
      if (set) members.push(m), sets.push(set);
      else team.notFound.push(m.label);
    }

    setTeam(members, sets);
    refresh();
    const legend = members.length ? teamLegend() : "";
    if (team.notFound.length) {
      teamMessage(el("span", {}, legend, `${legend ? " · " : ""}Not found: ${team.notFound.join(", ")}`), "error");
    } else teamMessage(legend);
  } catch (e) {
    console.error(e);
    teamMessage("Couldn't load the team from CSES. Try again.", "error");
    refresh();
  } finally {
    setTeamBusy(false);
  }
}
