// All styles. Injected as a <style> element (not manifest "css") so tabs that are
// already open keep their styles when the extension updates.

const style = document.createElement("style");
style.id = `${ID}-style`;
style.textContent = `
  #${ID}-bar {
    position: sticky; top: 0; z-index: 9999;
    background: #fff; padding: 10px; margin: 8px 0 12px;
    border: 1px solid #ddd; border-radius: 10px; display: flex; gap: 8px; align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  #${ID}-bar button {
    padding: 6px 10px; border: 1px solid #bbb; border-radius: 8px; cursor: pointer; background: #fafafa;
  }
  #${ID}-bar button:hover { background: #f0f0f0; }
  #${ID}-bar input { min-width: 220px; }
  #${ID}-bar .stat { margin-left: auto; font-size: 12px; color: #555; }

  #${ID}-table {
    width: 100%; border-collapse: collapse; margin: 10px 0 30px; font-size: 14px;
  }
  #${ID}-table th, #${ID}-table td {
    border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;
  }
  #${ID}-table th { background: #f6f6f6; text-align: left; }

  .topic-badge {
    display: inline-block; padding: 2px 6px; border-radius: 6px; background: #eef3ff; border: 1px solid #d6defc; font-size: 12px; margin-left: 6px;
  }
  .badge-full { color: #117a00; }
  .soft-hidden { display: none !important; }
  .hide-topic-badge .topic-badge { display: none !important; }
`;
document.head.appendChild(style);
