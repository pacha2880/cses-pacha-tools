// The two views: CSES's original lists and one list sorted by solves.

// Adds a topic badge next to each task link (shown only in the sorted list)
function ensureTopicBadges() {
  for (const row of state.data) {
    const a = $("a[href]", row.li);
    if (!a) continue;
    if ($(".topic-badge", row.li)) continue;
    const badge = document.createElement("span");
    badge.className = "topic-badge";
    badge.textContent = row.topic;
    a.insertAdjacentElement("afterend", badge);
  }
}

function applyFilterOriginal() {
  for (const row of state.data) row.li.classList.toggle("soft-hidden", !isVisible(row));
}

// Who on the team solved a task: one dot per teammate (fixed color and position, filled =
// solved, names in the tooltip), or a count for more than 4 teammates. Null without a team.
function teamMarks(row) {
  const n = state.team.length;
  if (!n) return null;
  const names = state.team.filter((_, i) => row.solvedBy.has(i)).map(m => m.label);
  const marks = document.createElement("span");
  marks.className = "pacha-team";
  marks.title = names.length ? `Solved by ${names.join(", ")}` : "No teammate solved it";
  if (n > 4) {
    marks.classList.add("count");
    marks.textContent = `${row.solvedBy.size}/${n}`;
  } else {
    for (let i = 0; i < n; i++) marks.append(teamDot(i, row.solvedBy.has(i)));
  }
  return marks;
}

function teamDot(i, on) {
  const dot = document.createElement("span");
  dot.className = `dot${on ? " on" : ""}`;
  dot.dataset.i = i;
  return dot;
}

// Puts the team marks next to each task link in CSES's lists
function renderTeamMarks() {
  for (const row of state.data) {
    $(".pacha-team", row.li)?.remove();
    const marks = teamMarks(row);
    if (marks) $("a[href]", row.li).insertAdjacentElement("afterend", marks);
  }
}

// Shows/hides CSES's own <h2> + <ul.task-list> sections (to swap with the sorted list)
function setOriginalVisibility(show) {
  for (const h of $$("h2")) h.classList.toggle("soft-hidden", !show);
  for (const ul of $$(`ul.task-list:not(#${ID}-sorted)`)) ul.classList.toggle("soft-hidden", !show);
  document.body.classList.toggle("hide-topic-badge", show);
}

function destroySorted() {
  $(`#${ID}-sorted`)?.remove();
}

function showOriginal() {
  destroySorted();
  setOriginalVisibility(true);
  applyFilterOriginal();
  updateStats();
}

// "By solves": one CSES task list built from clones of CSES's own <li class="task">, so it
// keeps CSES's styling, theme, status icons and the team dots, plus the topic badge.
function renderSorted() {
  setOriginalVisibility(false);
  destroySorted();

  const rows = state.data.filter(isVisible);
  rows.sort((a, b) => (b.solvedCount ?? -1) - (a.solvedCount ?? -1));

  const ul = document.createElement("ul");
  ul.id = `${ID}-sorted`;
  ul.className = "task-list";
  for (const row of rows) {
    const li = row.li.cloneNode(true);
    li.classList.remove("soft-hidden");
    ul.appendChild(li);
  }
  $(`#${ID}-bar`).insertAdjacentElement("afterend", ul);
  updateStats();
}

// Call after state.data changes
function refresh() {
  renderTeamMarks();
  if (state.mode === "sorted") renderSorted();
  else showOriginal(); // re-applies the filter too
}
