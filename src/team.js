// Team: teammates (state.team) and which tasks each solved, kept apart from the user's own
// status (row.solvedBy next to row.solved; CSES's green check is never touched).
// The chips UI (ui.js) calls addMember / removeMember / toggleHidden / useTeam.

const SLOTS = 6; // dot colors in styles.js
const SOLVED_TTL = 30 * 60 * 1000; // solved sets cached in sessionStorage this long

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

// Set of taskIds fully solved by a user, scraped from /problemset/user/<id>/; null if that
// page has no statistics (unknown id, or logged out). Cached per tab session.
async function fetchSolvedSet(userId) {
  const key = `${ID}-solved-${userId}`;
  const cached = JSON.parse(sessionStorage.getItem(key) || "null");
  if (cached && Date.now() - cached.t < SOLVED_TTL) return new Set(cached.ids);

  const doc = await fetchDoc(`/problemset/user/${encodeURIComponent(userId)}/`);
  if (!doc || !$("table.course-user-solved", doc)) return null;
  const set = new Set();
  for (const a of $$('table.course-user-solved a.task-score.icon.full[href*="/problemset/task/"]', doc)) {
    const id = taskIdFromUrl(a.getAttribute("href"));
    if (id) set.add(id);
  }
  sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), ids: [...set] }));
  return set;
}

// At most two user pages loading at a time
const loadQueue = [];
let loading = 0;
function queueLoad(fn) {
  return new Promise((resolve, reject) => {
    loadQueue.push(() => fn().then(resolve, reject));
    pumpLoads();
  });
}
function pumpLoads() {
  while (loading < 2 && loadQueue.length) {
    loading++;
    loadQueue.shift()().finally(() => {
      loading--;
      pumpLoads();
    });
  }
}

// Adds `names` as CSES friends of the logged-in user (the only way to look up a username's id
// when it is not in data/users.txt).
async function addFriends(names) {
  const friendsUrl = `/user/${myUserId()}/friends/`;
  let doc = await fetchDoc(friendsUrl);
  for (const name of names) {
    const token = doc && $("input[name='csrf_token']", doc)?.value;
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

// Resolves a typed name to { id, label }: numeric id, data/users.txt, CSES friends. Null if unknown.
async function resolveName(text) {
  if (/^\d+$/.test(text)) return { id: text, label: text };
  const user = findUser(await loadUsers(), text);
  if (user) return user;
  return (await loadFriends()).find(f => f.label.toLowerCase() === text.toLowerCase()) ?? null;
}

// Looks a name up by adding it as a CSES friend; asks once (consent remembered).
// Returns { id, label }, null if not found, or "cancelled".
async function lookUpViaFriends(name) {
  if (!myUserId()) return null;
  if (localStorage.getItem(STORAGE_KEYS.friendConsent) !== "1") {
    const ok = await askTeam(`CSES only reveals ${name}'s user ID through your friends list. Add ${name} as a CSES friend?`, "Add as friend");
    if (!ok) return "cancelled";
    localStorage.setItem(STORAGE_KEYS.friendConsent, "1");
  }
  await addFriends([name]);
  const friends = await loadFriends(true);
  return friends.find(f => f.label.toLowerCase() === name.toLowerCase()) ?? null;
}

// --- Team state ---

const isShown = m => m.status === "ready" && !m.hidden;

// row.solvedBy = slots of the shown teammates who solved each task (slots are unique: at most
// SLOTS teammates)
function recomputeSolvedBy() {
  const shown = state.team.filter(isShown);
  for (const row of state.data) {
    row.solvedBy = new Set(shown.filter(m => m.set.has(row.taskId)).map(m => m.slot));
  }
}

function freeSlot() {
  const used = new Set(state.team.map(m => m.slot));
  for (let s = 0; s < SLOTS; s++) if (!used.has(s)) return s;
  return -1;
}

let refreshPending = false;
// Re-renders once per frame, however many teammates arrive at once
function teamChanged() {
  saveTeam();
  renderChips();
  if (refreshPending) return;
  refreshPending = true;
  requestAnimationFrame(() => {
    refreshPending = false;
    recomputeSolvedBy();
    refresh();
  });
}

function saveTeam() {
  localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(state.team.map(({ id, label, slot, hidden }) => ({ id, label, slot, hidden }))));
  rememberTeamSoon();
}

// Adds a resolved user ({ id, label }) and loads what they solved.
// Returns "added", "duplicate" or "full" (one color per teammate, SLOTS colors).
function addMember(user, { hidden = false, slot = freeSlot() } = {}) {
  if (state.team.some(m => m.id === user.id)) return "duplicate";
  if (slot < 0) return "full";
  const member = { id: user.id, label: user.label, slot, hidden, status: "loading", set: new Set(), solved: null };
  state.team.push(member);
  rememberMate(user);
  teamChanged();
  queueLoad(() => fetchSolvedSet(member.id))
    .then(set => {
      if (!state.team.includes(member)) return; // removed while loading
      if (set) Object.assign(member, { status: "ready", set, solved: set.size });
      else member.status = "error";
      announce(set ? `${member.label}: ${set.size} solved` : `${member.label}: not found on CSES`);
      teamChanged();
    })
    .catch(e => {
      console.error(e);
      if (!state.team.includes(member)) return;
      member.status = "error";
      teamChanged();
    });
  return "added";
}

function removeMember(member) {
  if (!state.team.includes(member)) return;
  state.team = state.team.filter(m => m !== member);
  announce(`${member.label} removed`);
  teamChanged();
}

function toggleHidden(member) {
  member.hidden = !member.hidden;
  announce(`${member.label} ${member.hidden ? "hidden" : "shown"}`);
  teamChanged();
}

// Replaces the team (a saved or recent team picked from the suggestions)
function useTeam(users) {
  state.team = [];
  for (const u of users) addMember(u);
  teamChanged();
}

// --- History: recent teammates and recent teams (offered in the suggestions) ---

function rememberMate(user) {
  const mates = readJson(STORAGE_KEYS.recentMates, []).filter(m => m.id !== user.id);
  localStorage.setItem(STORAGE_KEYS.recentMates, JSON.stringify([{ id: user.id, label: user.label }, ...mates].slice(0, 20)));
}

// Same people, whatever the order
const teamKey = users => users.map(u => u.id).sort().join(",");
const sameTeam = (a, b) => teamKey(a) === teamKey(b);

// The current team as [{ id, label }], without members CSES did not find
const currentTeamUsers = () => state.team.filter(m => m.status !== "error").map(({ id, label }) => ({ id, label }));

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// A team of 2+ kept unchanged for 10 s, or still there when the tab is hidden or closed,
// becomes a recent team (5 kept)
let rememberTimer = 0;
function rememberTeam() {
  clearTimeout(rememberTimer);
  rememberTimer = 0;
  const users = currentTeamUsers();
  if (users.length < 2) return;
  const teams = readJson(STORAGE_KEYS.recentTeams, []).filter(t => !sameTeam(t, users));
  writeJson(STORAGE_KEYS.recentTeams, [users, ...teams].slice(0, 5));
}
function rememberTeamSoon() {
  clearTimeout(rememberTimer);
  rememberTimer = setTimeout(rememberTeam, 10000);
}
document.addEventListener("visibilitychange", () => document.hidden && rememberTimer && rememberTeam());
addEventListener("pagehide", () => rememberTimer && rememberTeam());

// Saved (starred) teams: kept until unstarred, listed first in the suggestions
const savedTeams = () => readJson(STORAGE_KEYS.savedTeams, []);
const isSaved = users => savedTeams().some(t => sameTeam(t, users));

// Stars or unstars a team; returns true if it is now saved
function toggleSaved(users) {
  const saved = isSaved(users);
  const rest = savedTeams().filter(t => !sameTeam(t, users));
  writeJson(STORAGE_KEYS.savedTeams, saved ? rest : [users, ...rest]);
  if (saved) {
    // Unstarred: it stays at hand as the most recent team
    const recent = readJson(STORAGE_KEYS.recentTeams, []).filter(t => !sameTeam(t, users));
    writeJson(STORAGE_KEYS.recentTeams, [users, ...recent].slice(0, 5));
  }
  return !saved;
}

function forgetTeam(users) {
  writeJson(STORAGE_KEYS.recentTeams, readJson(STORAGE_KEYS.recentTeams, []).filter(t => !sameTeam(t, users)));
}

// Restores the saved team on page load (migrating the old comma-separated box once).
async function restoreTeam() {
  let saved = readJson(STORAGE_KEYS.team, null);
  const legacy = localStorage.getItem(STORAGE_KEYS.mates);
  if (!myUserId()) {
    if (saved?.length || legacy) teamMessage("Log in to CSES to see your team.", "error");
    return;
  }
  if (!saved && legacy) {
    saved = [];
    let all = true;
    for (const name of legacy.split(",").map(s => s.trim()).filter(Boolean)) {
      const user = await resolveName(name);
      if (!user) all = false;
      else if (!saved.some(s => s.id === user.id)) saved.push(user);
    }
    if (all) localStorage.removeItem(STORAGE_KEYS.mates); // else retried on the next visit
  }
  for (const m of saved ?? []) addMember(m, { hidden: !!m.hidden, slot: Number.isInteger(m.slot) && !state.team.some(t => t.slot === m.slot) ? m.slot : freeSlot() });
}
