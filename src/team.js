// "Paint team": marks as solved every task solved by any of the given teammates.

// Set of taskIds fully solved by a user, scraped from /problemset/user/<id>/
async function fetchSolvedSet(userId) {
  const url = `/problemset/user/${encodeURIComponent(userId)}/`;
  const doc = await fetchDoc(url);
  if (!doc) throw new Error(`Failed to fetch ${url}`);
  const anchors = doc.querySelectorAll('table.course-user-solved a.task-score.icon.full[href*="/problemset/task/"]');
  const set = new Set();
  anchors.forEach(a => {
    const id = taskIdFromUrl(a.getAttribute("href"));
    if (id) set.add(id);
  });
  return set;
}

// Accepts a numeric user id or a username. For usernames, looks them up in the
// logged-in user's friend list and, if missing, ADDS them as a friend on CSES.
async function resolveFriendId(idOrName) {
  if (/^\d+$/.test(idOrName)) return idOrName;

  const myId = userIdFromUrl($(".controls a.account[href*='/user/']")?.getAttribute("href"));
  if (!myId) return null;

  const friendsUrl = `/user/${myId}/friends/`;
  const wanted = idOrName.trim().toLowerCase();
  const findFriend = doc => {
    const link = $$("table a[href^='/user/']", doc).find(a => a.textContent.trim().toLowerCase() === wanted);
    return link ? userIdFromUrl(link.getAttribute("href")) : null;
  };

  let doc = await fetchDoc(friendsUrl);
  if (!doc) return null;
  const found = findFriend(doc);
  if (found) return found;

  const token = $("input[name='csrf_token']", doc)?.value;
  if (!token) return null;

  const formData = new URLSearchParams();
  formData.append("csrf_token", token);
  formData.append("add", idOrName);
  await fetch(friendsUrl, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  doc = await fetchDoc(friendsUrl);
  return doc ? findFriend(doc) : null;
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

// `raw` is the comma-separated input. Entries that can't be resolved are skipped silently.
async function runTeamPaint(raw) {
  const entries = [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];

  const mateIds = [];
  for (const entry of entries) {
    const id = await resolveFriendId(entry);
    if (id) mateIds.push(id);
  }

  clearTeamPaint();
  if (mateIds.length === 0) return refresh();

  try {
    const sets = await Promise.all(mateIds.map(fetchSolvedSet));
    const union = new Set(sets.flatMap(s => [...s]));
    paintTeam(union);
    refresh();
  } catch (e) {
    console.error(e);
    alert("Couldn't fetch solved problems. Are the IDs correct? Are you logged in?");
  }
}
