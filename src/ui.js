// Toolbar injected above the first <h2>, and its handlers.
// Row 1: view switch + "Hide solved" + stats. Row 2: team box.

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function updateStats() {
  const stat = $(`#${ID}-bar .stat`);
  if (!stat) return;
  const shown = state.data.filter(isVisible).length;
  const solved = state.data.filter(d => d.solved).length;
  stat.textContent = `Showing ${shown}/${state.data.length} · Solved ${solved}`;
}

function setView(mode) {
  state.mode = mode;
  localStorage.setItem(STORAGE_KEYS.view, mode);
  for (const btn of $$(`#${ID}-bar .view-switch button`)) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === mode));
  }
  if (mode === "sorted") renderSortedTable();
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

  const hideSolved = el("input", { type: "checkbox", checked: state.hideSolved });
  hideSolved.onchange = () => {
    state.hideSolved = hideSolved.checked;
    localStorage.setItem(STORAGE_KEYS.hideSolved, state.hideSolved ? "1" : "0");
    if (state.mode === "sorted") renderSortedTable();
    else {
      applyHideSolvedOriginal();
      updateStats();
    }
  };

  const mates = el("input", {
    type: "text",
    placeholder: "Teammate IDs or usernames, comma-separated",
    value: localStorage.getItem(STORAGE_KEYS.mates) || "",
  });
  const clear = el("button", { type: "button", className: "clear", textContent: "×", title: "Clear team" });
  const team = el("form", { className: "row team" },
    el("label", { textContent: "Team", htmlFor: `${ID}-mates` }),
    el("span", { className: "mates" }, mates, clear),
    el("button", { type: "submit", textContent: "Paint team" }),
  );
  mates.id = `${ID}-mates`;
  // Enter or the button applies the box; an empty box clears the team.
  team.onsubmit = e => {
    e.preventDefault();
    const raw = mates.value.trim();
    localStorage.setItem(STORAGE_KEYS.mates, raw);
    runTeamPaint(raw);
  };
  clear.onclick = () => {
    mates.value = "";
    team.requestSubmit();
    mates.focus();
  };

  const msg = el("div", { className: "team-msg", role: "status" });

  const bar = el("div", { id: `${ID}-bar` },
    el("div", { className: "row" },
      viewSwitch,
      el("label", { className: "check" }, hideSolved, " Hide solved"),
      el("span", { className: "stat", role: "status" }),
    ),
    team,
    msg,
  );

  matchPageBackground(bar);
  document.addEventListener("theme-changed", () => matchPageBackground(bar));

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

// Progress text in the stats area while the team loads; refresh() puts the stats back.
function teamProgress(text) {
  const stat = $(`#${ID}-bar .stat`);
  if (stat) stat.textContent = text;
}

function setTeamBusy(busy) {
  for (const btn of $$(`#${ID}-bar .team button`)) btn.disabled = busy;
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
