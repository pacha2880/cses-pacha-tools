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

  #${ID}-table {
    width: 100%; border-collapse: collapse; margin: 10px 0 30px; font-size: 14px;
  }
  #${ID}-table th, #${ID}-table td {
    border: 1px solid rgba(128,128,128,.4); padding: 6px 8px; vertical-align: top;
  }
  #${ID}-table th { background: rgba(128,128,128,.15); text-align: left; }

  .topic-badge {
    display: inline-block; padding: 2px 6px; border-radius: 6px; font-size: 12px; margin-left: 6px;
    background: rgba(128,128,128,.15); border: 1px solid rgba(128,128,128,.4);
  }
  #${ID}-table td.status { width: 80px; text-align: center; vertical-align: middle; }
  .soft-hidden { display: none !important; }
  .hide-topic-badge .topic-badge { display: none !important; }
`;
document.head.appendChild(style);
