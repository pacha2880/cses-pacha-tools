// All styles. Injected as a <style> element (not manifest "css") so tabs that are
// already open keep their styles when the extension updates.
// Theme-proof: buttons and text inputs keep CSES's own (light/dark) styles; everything
// else uses inherited colors, currentColor and translucent grays. The bar's opaque
// background is copied from <body> in ui.js.

const style = document.createElement("style");
style.id = `${ID}-style`;
style.textContent = `
  #${ID}-bar {
    position: sticky; top: 0; z-index: 9999;
    margin: 8px 0 12px; padding: 8px 0;
    border-bottom: 1px solid rgba(128,128,128,.4);
    display: flex; flex-direction: column; gap: 8px;
    font-size: 0.9rem;
  }
  #${ID}-bar .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  #${ID}-bar .row > * { white-space: nowrap; }
  #${ID}-bar button { padding: 0.2em 0.8em; }
  #${ID}-bar button:focus { padding: calc(0.2em - 1px) calc(0.8em - 1px); }

  #${ID}-bar .view-switch { display: inline-flex; }
  #${ID}-bar .view-switch button { box-shadow: none; }
  #${ID}-bar .view-switch button:first-child { border-radius: 3px 0 0 3px; }
  #${ID}-bar .view-switch button:last-child { border-radius: 0 3px 3px 0; margin-left: -1px; }
  #${ID}-bar .view-switch button[aria-pressed="true"] {
    font-weight: bold; cursor: default;
    background: rgba(128,128,128,.45); box-shadow: inset 0 1px 3px rgba(0,0,0,.35);
  }

  #${ID}-bar .check { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  #${ID}-bar .stat { margin-left: auto; opacity: .75; }

  #${ID}-bar .team label { font-weight: bold; }
  #${ID}-bar .mates { position: relative; flex: 1; display: flex; min-width: 12em; }
  #${ID}-bar .mates input { flex: 1; padding: 0.2em 1.8em 0.2em 0.4em; background: transparent; }
  #${ID}-bar .mates .clear {
    position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
    border: 0; background: none; box-shadow: none; color: inherit; opacity: .6;
    padding: 0 0.4em; font-size: 1.1em; line-height: 1;
  }
  #${ID}-bar .mates .clear:hover { opacity: 1; }
  #${ID}-bar .mates input:placeholder-shown + .clear { display: none; }

  #${ID}-bar .team-msg:empty { display: none; }
  #${ID}-bar .team-msg { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  #${ID}-bar .team-msg.error::before { font-family: 'Font Awesome 5 Free'; font-weight: 900; content: '\\f071'; }

  #${ID}-bar select { font: inherit; color: inherit; background: transparent; border: 1px solid gray; border-radius: 3px; padding: 0.15em 0.3em; }
  #${ID}-bar select option { color: initial; }
  #${ID}-bar .legend { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  /* Team marks: one dot per teammate, fixed color and position; filled = solved */
  .pacha-team { display: inline-flex; gap: 3px; margin-left: 8px; vertical-align: middle; }
  .pacha-team.count { font-size: 0.85em; opacity: .8; }
  .pacha-team .dot, #${ID}-bar .dot {
    display: inline-block; width: 0.65em; height: 0.65em; border-radius: 50%; box-sizing: border-box;
    border: 2px solid var(--c); opacity: .9;
  }
  .pacha-team .dot:not(.on) { opacity: .45; }
  .dot.on { background: var(--c); }
  .dot[data-i="0"] { --c: #3b82f6; }
  .dot[data-i="1"] { --c: #f59e0b; }
  .dot[data-i="2"] { --c: #d946ef; }
  .dot[data-i="3"] { --c: #14b8a6; }


  .topic-badge {
    display: inline-block; padding: 0 6px; border-radius: 3px; font-size: 0.75em; margin-left: 8px; vertical-align: middle; opacity: .85;
    background: rgba(128,128,128,.15); border: 1px solid rgba(128,128,128,.4);
  }
  .soft-hidden { display: none !important; }
  .hide-topic-badge .topic-badge { display: none !important; }
`;
document.head.appendChild(style);
