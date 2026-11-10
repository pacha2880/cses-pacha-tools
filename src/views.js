// The two views: CSES's original lists and our sorted table.

// Adds a topic badge next to each task link (hidden in the original view by .hide-topic-badge)
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

function applyHideSolvedOriginal() {
  for (const row of state.data) row.li.classList.toggle("soft-hidden", !isVisible(row));
}

// Shows/hides CSES's own <h2> + <ul.task-list> sections (to swap with the table)
function setOriginalVisibility(show) {
  for (const h of $$("h2")) h.classList.toggle("soft-hidden", !show);
  for (const ul of $$("ul.task-list")) ul.classList.toggle("soft-hidden", !show);
  document.body.classList.toggle("hide-topic-badge", show);
}

function destroyTable() {
  $(`#${ID}-table-wrap`)?.remove();
}

function showOriginal() {
  destroyTable();
  setOriginalVisibility(true);
  applyHideSolvedOriginal();
  updateStats();
}

function renderSortedTable() {
  setOriginalVisibility(false);
  destroyTable();

  const rows = state.data.filter(isVisible);
  rows.sort((a, b) => (b.solvedCount ?? -1) - (a.solvedCount ?? -1));

  const wrap = document.createElement("div");
  wrap.id = `${ID}-table-wrap`;

  const tbl = document.createElement("table");
  tbl.id = `${ID}-table`;
  tbl.innerHTML = `
    <thead>
      <tr><th>#</th><th>Problem</th><th>Solved by</th><th>Topic</th><th>Status</th></tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = $("tbody", tbl);

  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const link = document.createElement("a");
    link.href = row.url;
    link.textContent = row.title;

    // The status cell is CSES's own indicator (check, dash, cross), including team painting
    const statusClass = $("span.task-score", row.li)?.className ?? "task-score icon";
    const cells = [
      idx + 1,
      link,
      Number.isInteger(row.solvedCount) ? row.solvedCount : "",
      row.topic,
      "",
    ];
    for (const content of cells) {
      const td = document.createElement("td");
      td.append(content);
      tr.appendChild(td);
    }
    tr.lastChild.className = `status ${statusClass}`;

    tbody.appendChild(tr);
  });

  wrap.appendChild(tbl);
  $(`#${ID}-bar`).insertAdjacentElement("afterend", wrap);
  updateStats();
}

// Call after state.data changes
function refresh() {
  if (state.mode === "sorted") renderSortedTable();
  else showOriginal(); // re-applies "Hide solved" too
}
