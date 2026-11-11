// CSES user directory for teammate suggestions: data/users.txt ("name\tid\tsolved" per line,
// best ranked first, built by scripts/users.mjs) loaded on first use, plus the logged-in
// user's CSES friends. Search is indexOf over one lowercase blob, so it stays fast per keystroke.

let usersPromise = null;

// { names, ids, solved, blob, starts }: blob is "\n" + lowercase names joined by "\n" + "\n",
// starts[i] is the offset of name i in blob.
function loadUsers() {
  usersPromise ??= fetch(chrome.runtime.getURL("data/users.txt"))
    .then(r => r.text())
    .then(text => {
      const lines = text.split("\n").filter(Boolean);
      const names = [], ids = [], solved = new Int32Array(lines.length), starts = new Int32Array(lines.length);
      let blob = "\n", i = 0;
      for (const line of lines) {
        const [name, id, n] = line.split("\t");
        names.push(name);
        ids.push(id);
        solved[i] = Number(n);
        starts[i++] = blob.length;
        blob += name.toLowerCase() + "\n"; // lowercasing keeps each name's length (checked on the data), so offsets match
      }
      return { names, ids, solved, blob, starts };
    })
    .catch(e => {
      console.error(e);
      return { names: [], ids: [], solved: new Int32Array(0), blob: "\n", starts: new Int32Array(0) };
    });
  return usersPromise;
}

const userAt = (u, i) => ({ id: u.ids[i], label: u.names[i], solved: u.solved[i] });

// Line index containing blob offset `pos` (binary search over starts)
function lineAt(u, pos) {
  let lo = 0, hi = u.starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (u.starts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Up to `limit` users whose name starts with q, then (3+ chars) contains q; best ranked first.
function searchUsers(u, q, limit) {
  q = q.toLowerCase();
  if (!q || q.includes("\n")) return [];
  const found = [], seen = new Set();
  const take = i => { if (!seen.has(i)) seen.add(i), found.push(userAt(u, i)); };
  // An exact match goes first, whatever its rank
  const exact = u.blob.indexOf(`\n${q}\n`);
  if (exact >= 0) take(lineAt(u, exact + 1));
  for (let pos = u.blob.indexOf(`\n${q}`); pos >= 0 && found.length < limit; pos = u.blob.indexOf(`\n${q}`, pos + 1)) take(lineAt(u, pos + 1));
  if (q.length >= 3) {
    for (let pos = u.blob.indexOf(q); pos >= 0 && found.length < limit; pos = u.blob.indexOf(q, pos + 1)) take(lineAt(u, pos));
  }
  return found;
}

// Exact (case-insensitive) name lookup in the directory
function findUser(u, name) {
  const pos = u.blob.indexOf(`\n${name.toLowerCase()}\n`);
  return pos < 0 ? null : userAt(u, lineAt(u, pos + 1));
}

let friendsPromise = null;

// The logged-in user's CSES friends as [{ id, label, solved }], most solved first (empty when
// logged out). Who: the friends page (fast). Solved counts: CSES's friends ranking, which is
// slow, so it is cached and refreshed in the background; data/users.txt until then.
function loadFriends(force = false) {
  const me = myUserId();
  if (!me) return Promise.resolve([]);
  if (force) friendsPromise = null;
  friendsPromise ??= (async () => {
    const [doc, users] = await Promise.all([fetchDoc(`/user/${me}/friends/`), loadUsers()]);
    if (!doc) return [];
    const counts = friendCounts(me);
    // Only profile links (/user/<id>/), not the "remove" links (/user/<me>/friends/remove/<id>)
    const list = $$("table a[href^='/user/']", doc)
      .filter(a => /^\/user\/\d+\/?$/.test(a.getAttribute("href")) && userIdFromUrl(a.getAttribute("href")) !== me)
      .map(a => {
        const id = userIdFromUrl(a.getAttribute("href")), label = a.textContent.trim();
        return { id, label, solved: counts[id] ?? findUser(users, label)?.solved };
      });
    return list.sort((a, b) => (b.solved ?? -1) - (a.solved ?? -1));
  })().catch(() => {
    friendsPromise = null; // retry next time
    return [];
  });
  return friendsPromise;
}

let countsRefreshing = false;

// id -> solved for the user's friends, from the friends ranking cached in localStorage;
// refreshed in the background when older than an hour (used from the next call on).
function friendCounts(me) {
  const cached = readJson(STORAGE_KEYS.friends, null);
  const ok = cached?.me === me && cached.counts;
  if ((!ok || Date.now() - cached.t > 3600 * 1000) && !countsRefreshing) {
    countsRefreshing = true;
    fetchDoc("/problemset/stats/friends/")
      .then(doc => {
        if (!doc) return;
        const counts = {};
        for (const tr of $$("table tr", doc)) {
          const id = userIdFromUrl($("a[href^='/problemset/user/']", tr)?.getAttribute("href"));
          if (id) counts[id] = Number(tr.cells[2]?.textContent);
        }
        localStorage.setItem(STORAGE_KEYS.friends, JSON.stringify({ me, t: Date.now(), counts }));
      })
      .catch(() => {})
      .finally(() => (countsRefreshing = false));
  }
  return ok ? cached.counts : {};
}

const myUserId = () => userIdFromUrl($(".controls a.account[href*='/user/']")?.getAttribute("href"));
