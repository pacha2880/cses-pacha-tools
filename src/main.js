// Entry point (loaded last). Initializes once the task lists are in the DOM.

function initOnce() {
  if (!$("ul.task-list") || !$("h2")) return false;

  state.data = extractAll();
  if (!state.data.length) return false;

  ensureTopicBadges();
  renderBar();
  showOriginal();
  return true;
}

if (!initOnce()) {
  const observer = new MutationObserver(() => {
    if (initOnce()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
