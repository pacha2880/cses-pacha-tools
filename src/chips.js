// Team field: one box with a chip per teammate and a text input with suggestions
// (ARIA combobox + listbox). Click a chip to hide/show that teammate, × removes it. The ☆ at
// the end of the field saves the current team, like a browser bookmark star.
// Suggestion order, most likely intent first:
//   empty box: saved teams (★), recent teams (☆ saves, × forgets; one click restores a team),
//              recent teammates, friends by solved;
//   typing:    exact match; your people (recent, friends), then everyone (rank order) by
//              prefix; your people, then everyone by substring (3+ chars);
//   last row:  "User ID n" for digits, or "Look up on CSES" when nothing matches exactly.

// Short lists are faster to scan (Hick's law; Baymard: about 10 at most on desktop)
const MAX_PEOPLE = 7, MAX_TEAMS = 3, MAX_RECENT_EMPTY = 3; // saved teams: all of them
const fieldPart = sel => $(`#${ID}-bar .team ${sel}`);

function teamField() {
  const input = el("input", {
    type: "text",
    id: `${ID}-mates`,
    autocomplete: "off",
    spellcheck: false,
  });
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", `${ID}-suggest`);

  const list = el("ul", { id: `${ID}-suggest`, className: "suggest", hidden: true });
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Teammate suggestions");

  const chips = el("span", { className: "chips" });
  chips.setAttribute("role", "list");
  chips.setAttribute("aria-label", "Teammates");

  // Bookmark star for the current team (shown with 2+ teammates)
  const star = el("button", { type: "button", className: "star save-team", hidden: true });
  star.onclick = () => {
    const saved = toggleSaved(currentTeamUsers());
    announce(saved ? "Team saved" : "Team removed from saved teams");
    renderChips();
    if (!list.hidden) updateSuggestions();
  };

  const field = el("div", { className: "field" }, chips, input, star);
  const combo = el("div", { className: "combo" }, field, list); // list outside the scrolling field
  field.onclick = e => {
    if (e.target === field || e.target === chips) input.focus();
  };

  const form = el("form", { className: "row team" }, el("label", { textContent: "Team", htmlFor: input.id }), combo);
  form.onsubmit = e => e.preventDefault();

  input.onfocus = () => updateSuggestions();
  input.onclick = () => list.hidden && updateSuggestions();
  input.oninput = () => updateSuggestions();
  input.onkeydown = onInputKey;
  input.onpaste = onPaste;
  combo.addEventListener("focusout", () =>
    setTimeout(() => {
      if (!combo.contains(document.activeElement)) closeSuggestions();
    }),
  );

  queueMicrotask(renderChips);
  return form;
}

// --- Chips ---

function renderChips() {
  const chips = fieldPart(".chips");
  if (!chips) return;
  const focusedId = document.activeElement?.closest?.(".chip")?.dataset.id;
  chips.replaceChildren(...state.team.map(chipFor));
  const input = fieldPart("input");
  input.placeholder = state.team.length ? "" : "Add teammates by username or ID";
  const users = currentTeamUsers();
  setStar(fieldPart(".save-team"), isSaved(users), "this team");
  fieldPart(".save-team").hidden = users.length < 2;
  if (focusedId) $(`.chip[data-id="${focusedId}"] .toggle`, chips)?.focus();
}

// ★ saved / ☆ not saved; the label says what a click does
function setStar(button, saved, what) {
  button.textContent = saved ? "★" : "☆";
  button.classList.toggle("on", saved);
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", `Save ${what}`);
  button.title = saved ? "Saved team · click to unsave" : `Save ${what}`;
}

function chipFor(member) {
  const { label, status, hidden, slot, solved } = member;
  const mark =
    status === "loading" ? el("span", { className: "spinner" })
    : status === "error" ? el("span", { className: "warn" })
    : teamDot(slot, !hidden);
  const toggle = el("button", { type: "button", className: "toggle" }, mark, label);
  if (status === "error") {
    toggle.title = `Not found on CSES · × to remove`;
    toggle.setAttribute("aria-description", "not found on CSES");
  } else if (status === "loading") {
    toggle.title = `Loading ${label}…`;
    toggle.setAttribute("aria-description", "loading");
  } else {
    toggle.title = `Click to ${hidden ? "show" : "hide"} · ${label} · ${solved} solved`;
    toggle.setAttribute("aria-description", `${solved} solved`);
    toggle.setAttribute("aria-pressed", String(!hidden));
    toggle.onclick = () => toggleHidden(member);
  }
  toggle.onkeydown = e => onChipKey(e, member);

  const remove = el("button", { type: "button", className: "remove", textContent: "×", tabIndex: -1 });
  remove.setAttribute("aria-label", `Remove ${label}`);
  // On mousedown: a chip re-render (a teammate finishing loading) between press and release
  // would swallow the click. onclick stays for assistive tech; removing twice is a no-op.
  remove.onmousedown = e => {
    e.preventDefault();
    removeChip(member);
  };
  remove.onclick = () => removeChip(member);

  const chip = el("span", { className: `chip ${status}${hidden ? " off" : ""}` }, toggle, remove);
  chip.setAttribute("role", "listitem");
  chip.dataset.id = member.id;
  chip.dataset.slot = slot;
  return chip;
}

// Removes a chip and moves focus to the next chip, or the input
function removeChip(member) {
  const i = state.team.indexOf(member);
  if (i < 0) return;
  removeMember(member);
  const next = state.team[i] ?? null;
  if (next) $(`.chip[data-id="${next.id}"] .toggle`, fieldPart(".chips"))?.focus();
  else fieldPart("input").focus();
}

function focusChip(i) {
  const toggles = $$(".chip .toggle", fieldPart(".chips"));
  if (i >= 0 && i < toggles.length) toggles[i].focus();
  else fieldPart("input").focus();
}

function onChipKey(e, member) {
  const i = state.team.indexOf(member);
  if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    removeChip(member);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    focusChip(Math.max(0, i - 1));
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    focusChip(i + 1);
  }
}

function flashChip(id) {
  const chip = $(`.chip[data-id="${id}"]`, fieldPart(".chips"));
  if (!chip) return;
  chip.classList.remove("flash");
  void chip.offsetWidth;
  chip.classList.add("flash");
}

// --- Adding ---

const loggedIn = () => !!myUserId() || (teamMessage("Log in to CSES to use Team.", "error"), false);

// Returns true if added
function addUser(user) {
  if (!loggedIn()) return false;
  const result = addMember(user);
  if (result === "duplicate") flashChip(user.id);
  if (result === "full") teamMessage(`Up to ${SLOTS} teammates: remove one to add ${user.label}.`, "error");
  return result === "added";
}

// Enter/comma/paste with no suggestion picked: exact name, id or friend; else say how to look it up
async function commitText(text) {
  text = text.trim();
  if (!text) return;
  const user = await resolveName(text);
  if (user) {
    if (addUser(user)) teamMessage("");
  } else teamMessage(`No CSES user “${text}” in the list. Pick “Look up on CSES” to find them through your friends list.`, "error");
}

async function lookUp(name) {
  if (!loggedIn()) return;
  teamMessage(`Looking up ${name}…`);
  const user = await lookUpViaFriends(name);
  if (user === "cancelled") return teamMessage("");
  friendsNow = await loadFriends(); // now includes the new friend
  if (!user) return teamMessage(`No CSES user “${name}”.`, "error");
  if (addUser(user)) teamMessage("");
}

// Pasting "a, b c" adds each, in order
async function onPaste(e) {
  const text = e.clipboardData.getData("text");
  if (!/[,\s]/.test(text.trim())) return;
  e.preventDefault();
  for (const part of text.split(/[,\s]+/)) await commitText(part);
}

// --- Suggestions ---

let options = [], active = -1, suggestToken = 0;

let friendsNow = null; // loadFriends() result once it has arrived

async function updateSuggestions() {
  const input = fieldPart("input");
  const q = input.value.trim();
  const token = ++suggestToken;
  // Friends can take a few seconds the first time: show the rest now, redo when they arrive
  if (!friendsNow) loadFriends().then(list => {
    friendsNow = list;
    if (token === suggestToken) updateSuggestions();
  });
  const users = await loadUsers();
  const friends = friendsNow ?? [];
  if (token !== suggestToken) return;

  const inTeam = new Set(state.team.map(m => m.id));
  const friendById = new Map(friends.map(f => [f.id, f]));
  // Two aligned columns: "friend" tag, then the solved count (right-aligned, tabular digits)
  const meta = u => ({
    tag: friendById.has(u.id) ? "friend" : "",
    solved: u.solved ?? friendById.get(u.id)?.solved ?? findUser(users, u.label)?.solved,
  });
  const recent = readJson(STORAGE_KEYS.recentMates, []);
  const known = [...recent, ...friends]; // recent first, then friends by solved
  const next = [], seen = new Set(inTeam);
  let people = 0;
  let cap = MAX_PEOPLE;
  const pushUser = u => {
    if (seen.has(u.id) || people >= cap) return;
    seen.add(u.id);
    people++;
    next.push({ kind: "user", user: u, meta: meta(u) });
  };

  if (!q) {
    const current = currentTeamUsers();
    const other = t => !sameTeam(t, current);
    for (const t of savedTeams().filter(other)) next.push({ kind: "team", users: t, saved: true });
    const recentTeams = readJson(STORAGE_KEYS.recentTeams, []).filter(t => other(t) && !isSaved(t));
    for (const t of recentTeams.slice(0, MAX_TEAMS)) next.push({ kind: "team", users: t, saved: false });
    for (const u of recent.slice(0, MAX_RECENT_EMPTY)) pushUser(u);
    cap = Infinity; // every friend; the list scrolls
    for (const u of friends) pushUser(u);
  } else {
    const lq = q.toLowerCase();
    const starts = u => u.label.toLowerCase().startsWith(lq);
    const exact = findUser(users, q) ?? known.find(u => u.label.toLowerCase() === lq);
    if (exact) pushUser(exact);
    const everyone = searchUsers(users, q, MAX_PEOPLE * 3);
    for (const u of known) if (starts(u)) pushUser(u);
    for (const u of everyone) if (starts(u)) pushUser(u);
    for (const u of known) if (u.label.toLowerCase().includes(lq)) pushUser(u);
    for (const u of everyone) pushUser(u);
    if (/^\d+$/.test(q)) {
      if (!inTeam.has(q)) next.unshift({ kind: "id", user: { id: q, label: q } }); // typed an id: first
    } else if (!exact && /^[\w.\-]+$/.test(q) && myUserId()) next.push({ kind: "lookup", name: q });
  }
  options = next;
  // Enter takes the highlighted row: a typed id, or a person whose name starts with the text.
  // Never "Look up" (it adds a CSES friend) nor a substring match: those need ↓ or a click.
  const first = options[0];
  const lq = q.toLowerCase();
  active = first && (first.kind === "id" || (first.kind === "user" && first.user.label.toLowerCase().startsWith(lq))) ? 0 : -1;
  renderSuggestions(q);
}

function renderSuggestions(q) {
  const list = fieldPart(".suggest");
  const input = fieldPart("input");
  if (!options.length) return closeSuggestions();
  list.replaceChildren(...options.map((o, i) => optionFor(o, i, q)));
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
  setActive(active);
}

// The typed part stays plain, the rest is bold (the part the suggestion adds)
function highlight(label, q) {
  const i = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return [el("b", { textContent: label })];
  return [el("b", { textContent: label.slice(0, i) }), label.slice(i, i + q.length), el("b", { textContent: label.slice(i + q.length) })];
}

function optionFor(o, i, q) {
  let body;
  if (o.kind === "user") {
    body = [
      el("span", { className: "name" }, ...highlight(o.user.label, q)),
      el("span", { className: "meta kind", textContent: o.meta.tag }),
      el("span", { className: "meta solved", textContent: o.meta.solved != null ? `${o.meta.solved} solved` : "" }),
    ];
  }
  else if (o.kind === "id") body = [el("span", { className: "name", textContent: `User ID ${o.user.id}` })];
  else if (o.kind === "lookup") body = [el("span", { className: "name" }, "Look up “", el("b", { textContent: o.name }), "” on CSES"), el("span", { className: "meta", textContent: "adds as CSES friend" })];
  else {
    // Row buttons act without picking the row (and keep focus in the input)
    const rowButton = (className, onclick) => {
      const b = el("button", { type: "button", className, tabIndex: -1 });
      b.onmousedown = e => e.preventDefault();
      b.onclick = e => {
        e.stopPropagation();
        onclick();
        updateSuggestions();
      };
      return b;
    };
    const star = rowButton("star", () => toggleSaved(o.users));
    setStar(star, o.saved, "this team");
    const forget = rowButton("forget", () => forgetTeam(o.users));
    forget.textContent = "×";
    forget.title = "Forget this team";
    forget.setAttribute("aria-label", "Forget this team");
    if (o.saved) forget.style.visibility = "hidden"; // unstar first; keeps the columns aligned
    body = [
      el("span", { className: "name", textContent: o.users.map(u => u.label).join(", ") }),
      el("span", { className: "meta", textContent: o.saved ? "saved team" : "recent team" }),
      star,
      forget,
    ];
  }
  const li = el("li", { id: `${ID}-opt-${i}`, className: `option ${o.kind}` }, ...body);
  li.setAttribute("role", "option");
  li.onmousedown = e => e.preventDefault(); // keep focus in the input
  li.onclick = () => choose(o);
  li.onmousemove = () => active !== i && setActive(i);
  return li;
}

function setActive(i) {
  active = i;
  const input = fieldPart("input");
  $$(".option", fieldPart(".suggest")).forEach((li, j) => li.setAttribute("aria-selected", String(j === i)));
  if (i >= 0) {
    input.setAttribute("aria-activedescendant", `${ID}-opt-${i}`);
    $(`#${ID}-opt-${i}`)?.scrollIntoView({ block: "nearest" });
  } else input.removeAttribute("aria-activedescendant");
}

function closeSuggestions() {
  const list = fieldPart(".suggest");
  const input = fieldPart("input");
  if (!list) return;
  suggestToken++;
  list.hidden = true;
  options = [];
  active = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function choose(o) {
  const input = fieldPart("input");
  input.value = "";
  closeSuggestions();
  input.focus();
  if (o.kind === "user" || o.kind === "id") addUser(o.user) && teamMessage("");
  else if (o.kind === "team") loggedIn() && useTeam(o.users);
  else if (o.kind === "lookup") lookUp(o.name);
}

function onInputKey(e) {
  const input = e.target;
  const open = !fieldPart(".suggest").hidden;
  const atStart = input.selectionStart === 0 && input.selectionEnd === 0;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!open) return updateSuggestions();
    const step = e.key === "ArrowDown" ? 1 : -1;
    setActive((active + step + options.length) % options.length);
  } else if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    if (e.isComposing) return;
    if (open && active >= 0) choose(options[active]);
    else if (input.value.trim()) {
      const text = input.value;
      input.value = "";
      closeSuggestions();
      commitText(text);
    }
  } else if (e.key === "Escape") {
    if (open) closeSuggestions();
    else input.value = "";
  } else if (e.key === "Backspace" && atStart && state.team.length) {
    // First press highlights the last chip, the second removes it
    e.preventDefault();
    focusChip(state.team.length - 1);
  } else if (e.key === "ArrowLeft" && atStart && state.team.length) {
    e.preventDefault();
    focusChip(state.team.length - 1);
  }
}
