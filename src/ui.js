// Toolbar injected above the first <h2>, and its handlers.
// Row 1: view switch + filter + stats. Row 2: team field (chips + suggestions, chips.js).

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function updateStats() {
  const stat = $(`#${ID}-bar .stat`);
  if (!stat) return;
  const shown = `Showing ${state.data.filter(isVisible).length}/${state.data.length}`;
  const me = state.data.filter(d => d.solved).length;
  if (!state.team.some(isShown)) return (stat.textContent = `${shown} · Solved ${me}`);
  const team = state.data.filter(d => d.solvedBy.size).length;
  const nobody = state.data.filter(d => !d.solved && !d.solvedBy.size).length;
  const hidden = state.team.filter(m => m.hidden).length;
  stat.textContent = `${shown} · Me ${me} · Team ${team}${hidden ? ` (${hidden} hidden)` : ""} · Nobody ${nobody}`;
}

function setView(mode) {
  state.mode = mode;
  localStorage.setItem(STORAGE_KEYS.view, mode);
  for (const btn of $$(`#${ID}-bar .view-switch button`)) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === mode));
  }
  if (mode === "sorted") renderSorted();
  else showOriginal();
}

// The sticky bar needs an opaque background: copy CSES's own, which changes with its theme.
function matchPageBackground(bar) {
  bar.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
}

function renderBar() {
  const existing = $(`#${ID}-bar`);
  if (existing) return existing;

  const viewSwitch = el("div", { className: "view-switch", role: "group", ariaLabel: "View" },
    ...[["original", "By topic"], ["sorted", "By solves"]].map(([mode, label]) => {
      const btn = el("button", { type: "button", textContent: label, onclick: () => setView(mode) });
      btn.dataset.mode = mode;
      btn.setAttribute("aria-pressed", String(state.mode === mode));
      return btn;
    }),
  );

  const filter = el("select", { ariaLabel: "Filter" },
    ...Object.entries(FILTERS).map(([value, label]) => el("option", { value, textContent: label, selected: value === state.filter })),
  );
  filter.onchange = () => {
    state.filter = filter.value;
    localStorage.setItem(STORAGE_KEYS.filter, state.filter);
    if (state.mode === "sorted") renderSorted();
    else {
      applyFilterOriginal();
      updateStats();
    }
  };

  const team = teamField();
  const msg = el("div", { className: "team-msg" });
  const live = el("span", { className: "sr-only", ariaLive: "polite" });

  const bar = el("div", { id: `${ID}-bar` },
    el("div", { className: "row" },
      viewSwitch,
      filter,
      el("span", { className: "stat" }),
    ),
    team,
    msg,
    live,
  );

  matchPageBackground(bar);
  matchPageBackground($(".suggest", bar));
  document.addEventListener("theme-changed", () => {
    matchPageBackground(bar);
    matchPageBackground($(".suggest", bar));
  });

  const firstH2 = $("h2");
  if (firstH2) firstH2.parentElement.insertBefore(bar, firstH2);
  else document.body.insertAdjacentElement("afterbegin", bar);

  return bar;
}

// --- Team feedback (used by team.js) ---

// Inline message under the team row; kind "error" adds a warning icon (not color alone).
function teamMessage(text, kind = "") {
  const msg = $(`#${ID}-bar .team-msg`);
  if (!msg) return;
  msg.replaceChildren(text);
  msg.className = `team-msg ${kind}`;
}

// Screen-reader announcement (polite)
function announce(text) {
  const live = $(`#${ID}-bar .sr-only`);
  if (live) live.textContent = text;
}

// Asks a yes/no question inline; resolves true if the user confirms.
function askTeam(question, yesLabel) {
  return new Promise(resolve => {
    const answer = ok => {
      teamMessage("");
      resolve(ok);
    };
    const yes = el("button", { type: "button", textContent: yesLabel, onclick: () => answer(true) });
    const no = el("button", { type: "button", textContent: "Cancel", onclick: () => answer(false) });
    const msg = $(`#${ID}-bar .team-msg`);
    msg.className = "team-msg ask";
    msg.replaceChildren(el("span", { textContent: question }), yes, no);
    yes.focus();
  });
}
