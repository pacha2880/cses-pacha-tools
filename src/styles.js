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

  /* Team field: looks like a CSES text input holding chips + a borderless input */
  #${ID}-bar .team .combo { position: relative; flex: 1; min-width: 14em; white-space: normal; }
  #${ID}-bar .team .field {
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
    padding: 3px 4px; border: 1px solid gray; border-radius: 3px; cursor: text;
    max-height: 4.6em; overflow-y: auto;
  }
  #${ID}-bar .team .field:focus-within { outline: 2px solid #4a90d9; outline-offset: -1px; }
  #${ID}-bar .chips { display: contents; }
  #${ID}-bar .field input {
    flex: 1; min-width: 8em; border: 0; outline: 0; box-shadow: none; background: transparent;
    color: inherit; font: inherit; padding: 1px 2px; margin: 0;
  }

  #${ID}-bar .chip {
    display: inline-flex; align-items: center; border-radius: 3px; line-height: 1.5;
    background: rgba(128,128,128,.15); border: 1px solid rgba(128,128,128,.4);
  }
  #${ID}-bar .chip button, #${ID}-bar .chip button:focus {
    border: 0; box-shadow: none; background: none; color: inherit; font: inherit;
    margin: 0; cursor: pointer; min-height: 0;
  }
  #${ID}-bar .chip .toggle, #${ID}-bar .chip .toggle:focus { display: inline-flex; align-items: center; gap: 5px; padding: 0 2px 0 6px; }
  #${ID}-bar .chip .remove, #${ID}-bar .chip .remove:focus { padding: 0 6px 0 3px; opacity: .6; font-size: 1.1em; line-height: 1; }
  #${ID}-bar .chip .remove:hover { opacity: 1; }
  #${ID}-bar .chip button:focus-visible { outline: 2px solid #4a90d9; outline-offset: -2px; border-radius: 3px; }
  #${ID}-bar .chip.off .toggle { opacity: .5; }
  #${ID}-bar .chip.error { border-color: #d33; }
  #${ID}-bar .chip.error .toggle { cursor: default; }
  #${ID}-bar .chip .warn::before { font-family: 'Font Awesome 5 Free'; font-weight: 900; content: '\\f071'; color: #d33; font-size: .85em; }
  #${ID}-bar .chip.flash { animation: ${ID}-flash .6s; }
  @keyframes ${ID}-flash { 50% { background: rgba(74,144,217,.45); } }
  #${ID}-bar .spinner {
    width: 0.65em; height: 0.65em; border-radius: 50%; box-sizing: border-box;
    border: 2px solid currentColor; border-right-color: transparent; opacity: .6;
    animation: ${ID}-spin .8s linear infinite;
  }
  @keyframes ${ID}-spin { to { transform: rotate(360deg); } }

  /* Suggestions under the field; background copied from <body> in ui.js */
  #${ID}-bar .suggest {
    position: absolute; left: -1px; right: -1px; top: 100%; z-index: 10000;
    margin: 2px 0 0; padding: 2px 0; list-style: none;
    border: 1px solid gray; border-radius: 3px; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  }
  #${ID}-bar .suggest[hidden] { display: none; }
  #${ID}-bar .option { display: flex; align-items: center; gap: 12px; padding: 3px 8px; cursor: pointer; white-space: nowrap; }
  #${ID}-bar .option[aria-selected="true"] { background: rgba(74,144,217,.25); }
  #${ID}-bar .option .name { overflow: hidden; text-overflow: ellipsis; }
  #${ID}-bar .option .name b { font-weight: bold; }
  #${ID}-bar .option .meta { margin-left: auto; opacity: .65; font-size: .9em; }
  #${ID}-bar .option .forget { border: 0; box-shadow: none; background: none; color: inherit; padding: 0 4px; opacity: .6; }
  #${ID}-bar .option .forget:hover { opacity: 1; }
  #${ID}-bar .option.lookup { border-top: 1px solid rgba(128,128,128,.3); }

  #${ID}-bar .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  #${ID}-bar .team-msg:empty { display: none; }
  #${ID}-bar .team-msg { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  #${ID}-bar .team-msg.error::before { font-family: 'Font Awesome 5 Free'; font-weight: 900; content: '\\f071'; }

  #${ID}-bar select { font: inherit; color: inherit; background: transparent; border: 1px solid gray; border-radius: 3px; padding: 0.15em 0.3em; }
  #${ID}-bar select option { color: initial; }

  /* Team marks: one dot per teammate, fixed color and position; filled = solved */
  .pacha-team { display: inline-flex; gap: 3px; margin-left: 8px; vertical-align: middle; }
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
  .dot[data-i="4"] { --c: #e11d48; }
  .dot[data-i="5"] { --c: #8b5cf6; }


  /* "By solves" list, easier to scan: the topic is a quiet fixed-width column with one left
     edge (alignment, proximity), the solves are right-aligned tabular numbers (the sort key),
     and secondary text is muted rather than boxed (hierarchy). Colors come from currentColor,
     so both CSES themes work. */
  #${ID}-sorted > li { align-items: baseline; }
  #${ID}-sorted > li > :first-child, #${ID}-sorted .task-score { align-self: stretch; }
  #${ID}-sorted > li:hover { background-color: rgba(128,128,128,.14); }
  #${ID}-sorted > li > a { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${ID}-sorted .pacha-team { flex: none; margin-left: .5em; }
  .topic-badge {
    flex: 0 0 13.5em; margin-left: 1.5em; font-size: .8em;
    opacity: .65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  #${ID}-sorted > li:hover .topic-badge { opacity: .85; }
  #${ID}-sorted .detail {
    flex: 0 0 auto; min-width: 10em; white-space: nowrap; /* fits "183819 / 191891" */
    margin-left: .5em; padding-right: .75em; text-align: right;
    font-variant-numeric: tabular-nums lining-nums; opacity: .75;
  }
  .soft-hidden { display: none !important; }
  .hide-topic-badge .topic-badge { display: none !important; }
`;
document.head.appendChild(style);
