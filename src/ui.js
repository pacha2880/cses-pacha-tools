// Toolbar injected above the first <h2>, and its button handlers.

function button(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

const hideSolvedLabel = () => `Hide solved: ${state.hideSolved ? "ON" : "OFF"}`;

function updateStats() {
  const stat = $(`#${ID}-bar .stat`);
  if (!stat) return;
  const shown = state.data.filter(isVisible).length;
  const solved = state.data.filter(d => d.solved).length;
  stat.textContent = `Showing ${shown}/${state.data.length} | Solved: ${solved}`;
}

function renderBar() {
  const existing = $(`#${ID}-bar`);
  if (existing) return existing;

  const bar = document.createElement("div");
  bar.id = `${ID}-bar`;

  const btnSort = button("Sort by solves", () => {
    state.mode = "sorted";
    renderSortedTable();
  });

  const btnToggle = button(hideSolvedLabel(), () => {
    state.hideSolved = !state.hideSolved;
    localStorage.setItem(STORAGE_KEYS.hideSolved, state.hideSolved ? "1" : "0");
    btnToggle.textContent = hideSolvedLabel();
    if (state.mode === "sorted") renderSortedTable();
    else {
      applyHideSolvedOriginal();
      updateStats();
    }
  });

  const btnRestore = button("Restore view", () => {
    state.mode = "original";
    showOriginal();
  });

  const stat = document.createElement("div");
  stat.className = "stat";

  const matesInput = document.createElement("input");
  matesInput.placeholder = "Teammate IDs (comma-separated)";
  matesInput.value = localStorage.getItem(STORAGE_KEYS.mates) || "";

  const btnTeamPaint = button("Paint team", () => {
    const raw = (matesInput.value || "").trim();
    localStorage.setItem(STORAGE_KEYS.mates, raw);
    runTeamPaint(raw);
  });

  const btnTeamClear = button("Clear team", () => {
    clearTeamPaint();
    refresh();
  });

  bar.append(btnSort, btnToggle, btnRestore, stat, matesInput, btnTeamPaint, btnTeamClear);

  const firstH2 = $("h2");
  if (firstH2) firstH2.parentElement.insertBefore(bar, firstH2);
  else document.body.insertAdjacentElement("afterbegin", bar);

  return bar;
}
