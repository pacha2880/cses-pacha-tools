(() => {
  const ID = "pacha-cses-tools-ext";
  if (window[ID]) return; // evita doble inyección
  window[ID] = true;

  // ===== Estilos =====
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

  // ===== Estado =====
  const state = {
    mode: "original", // "original" | "sorted"
    hideSolved: localStorage.getItem(`${ID}-hideSolved`) === "1",
    data: []
  };

  // ===== Utils =====
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function taskIdFromUrl(href) {
    const m = (href || "").match(/\/problemset\/task\/(\d+)/);
    return m ? m[1] : null;
  }

  // Índice: taskId -> <li.task>
  function buildTaskIndex() {
    const idx = new Map();
    for (const li of $$("li.task")) {
      const a = $("a[href]", li);
      if (!a) continue;
      const id = taskIdFromUrl(a.getAttribute("href"));
      if (id) idx.set(id, li);
    }
    return idx;
  }

  // GET a /problemset/user/<id>/ y devuelve Set de taskIds resueltos (class .full)
  async function fetchSolvedSet(userId) {
    const url = `/problemset/user/${encodeURIComponent(userId)}/`;
    const resp = await fetch(url, { credentials: "same-origin" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = doc.querySelectorAll('table.course-user-solved a.task-score.icon.full[href*="/problemset/task/"]');
    const set = new Set();
    anchors.forEach(a => {
      const id = taskIdFromUrl(a.getAttribute("href"));
      if (id) set.add(id);
    });
    return set;
  }

  // Devuelve (li, a, scoreSpan) del li.task
  function getTaskDomParts(li) {
    const a = li.querySelector("a[href]");
    const score = li.querySelector("span.task-score");
    return { a, score };
  }

  // Asegura que exista el span.task-score; si no existe, lo crea
  function ensureScoreSpan(li) {
    let score = li.querySelector("span.task-score");
    if (!score) {
      score = document.createElement("span");
      score.className = "task-score icon"; // estado base sin 'full'
      // lo colocamos al final del li
      li.appendChild(document.createTextNode(" "));
      li.appendChild(score);
    } else {
      // si traía clases raras, garantizamos base 'task-score icon'
      if (!score.classList.contains("task-score")) score.classList.add("task-score");
      if (!score.classList.contains("icon")) score.classList.add("icon");
    }
    return score;
  }

  function buildDataIndex() {
    const idx = new Map();
    for (const row of state.data) {
      if (row.taskId) idx.set(row.taskId, row);
    }
    return idx;
  }

  function resetSolvedToBase() {
    for (const row of state.data) row.solved = row.baseSolved;
  }

  function paintTeamOnProblemset(matesUnion) {
    const indexDom  = buildTaskIndex();
    const indexData = buildDataIndex(); // 👈 usamos tu helper

    for (const [taskId, li] of indexDom) {
      const { a } = getTaskDomParts(li);
      const id = a ? taskIdFromUrl(a.getAttribute("href")) : null;
      if (!id) continue;

      const score = ensureScoreSpan(li);

      if (matesUnion && matesUnion.has(id)) {
        // DOM: marca como full si no lo era y déjalo marcado para poder limpiarlo
        if (!score.classList.contains("full")) {
          score.classList.add("full");
          score.setAttribute("data-pacha-painted", "1");
        }
        // DATA: importantísimo -> refleja el “full” en la fila correspondiente
        const row = indexData.get(id);
        if (row) row.solved = true;  // 👈 ESTA LÍNEA ES LA QUE TE FALTABA
      }
    }
  }


  // Limpia solo lo que nosotros pintamos: quita 'full' donde tenga data-pacha-painted="1"
  function clearTeamPaint() {
    const painted = document.querySelectorAll('span.task-score[data-pacha-painted="1"]');
    const indexData = buildDataIndex();

    painted.forEach(span => {
      // DOM
      span.classList.remove("full");
      span.removeAttribute("data-pacha-painted");

      // DATA: ubicar el li y su taskId para restaurar “solved” = baseSolved
      const li = span.closest("li.task");
      const a  = li ? li.querySelector("a[href]") : null;
      const id = a ? taskIdFromUrl(a.getAttribute("href")) : null;
      if (id && indexData.has(id)) {
        const row = indexData.get(id);
        row.solved = row.baseSolved; // 👈 vuelve a su estado original
      }
    });
  }

  async function resolveFriendId(inputIdOrName) {
    if (/^\d+$/.test(inputIdOrName)) return inputIdOrName;

    // obtener tu propio id desde el link de cuenta
    const meLink = document.querySelector(".controls a.account[href*='/user/']");
    const myId = meLink ? meLink.getAttribute("href").match(/\/user\/(\d+)/)?.[1] : null;
    if (!myId) return null;

    // 1. traer lista de amigos actual
    const friendsUrl = `/user/${myId}/friends/`;
    let resp = await fetch(friendsUrl, { credentials: "same-origin" });
    if (!resp.ok) return null;
    let html = await resp.text();
    let doc = new DOMParser().parseFromString(html, "text/html");

    // 2. intentar encontrarlo ya
    let link = Array.from(doc.querySelectorAll("table a[href^='/user/']"))
      .find(a => a.textContent.trim().toLowerCase() === inputIdOrName.trim().toLowerCase());
    if (link) return link.getAttribute("href").match(/\/user\/(\d+)/)?.[1];

    // 3. si no está, intentar agregarlo usando el formulario
    const token = doc.querySelector("input[name='csrf_token']")?.value;
    if (!token) return null;

    const formData = new URLSearchParams();
    formData.append("csrf_token", token);
    formData.append("add", inputIdOrName);

    await fetch(friendsUrl, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // 4. volver a obtener lista de amigos actualizada
    resp = await fetch(friendsUrl, { credentials: "same-origin" });
    html = await resp.text();
    doc = new DOMParser().parseFromString(html, "text/html");

    // 5. buscar nuevamente
    link = Array.from(doc.querySelectorAll("table a[href^='/user/']"))
      .find(a => a.textContent.trim().toLowerCase() === inputIdOrName.trim().toLowerCase());

    return link ? link.getAttribute("href").match(/\/user\/(\d+)/)?.[1] : null;
  }




  function parseDetailCounts(text) {
    if (!text) return [null, null];
    const m = text.replace(/\u00a0/g, " ").match(/(\d+)\s*\/\s*(\d+)/);
    return m ? [parseInt(m[1],10), parseInt(m[2],10)] : [null, null];
  }

  // Extrae data de todas las secciones h2 + ul.task-list
  function extractAll() {
    const result = [];
    for (const h2 of $$("h2")) {
      const topic = h2.textContent.trim();
      const ul = h2.nextElementSibling;
      if (!ul || !ul.classList.contains("task-list")) continue;

      for (const li of $$("li.task", ul)) {
        const a = $("a[href]", li);
        if (!a) continue;
        const detail = $("span.detail", li);
        const score  = $("span.task-score", li);
        const title  = (a.textContent || "").trim();
        const url    = a.href || new URL(a.getAttribute("href"), location.origin).href;
        const solved = !!(score && score.classList.contains("full"));
        const [solvedCount, totalCount] = parseDetailCounts(detail ? detail.textContent : "");
        const taskId = taskIdFromUrl(a.getAttribute("href"));
        const baseSolved = solved;

        result.push({
          li, topic, title, url,
          taskId,            // nuevo campo
          solved,            // se actualiza dinámicamente luego
          baseSolved,        // guarda estado original
          solvedCount, totalCount
        });
      }
    }
    return result;
  }

  // Badges de tópico en vista original
  function ensureTopicBadgesOriginal(data) {
    for (const row of data) {
      const a = row.li.querySelector("a[href]");
      if (!a) continue;
      if (row.li.querySelector(".topic-badge")) continue;
      const badge = document.createElement("span");
      badge.className = "topic-badge";
      badge.textContent = row.topic;
      a.insertAdjacentElement("afterend", badge);
    }
  }

  // Ocultar/mostrar resueltos en la vista original
  function applyHideSolvedOriginal(data, hide) {
    for (const row of data) {
      if (row.solved) row.li.classList.toggle("soft-hidden", !!hide);
      else row.li.classList.remove("soft-hidden");
    }
  }

  // Mostrar/ocultar todos los h2 y ul.task-list (para cambiar a tabla)
  function setOriginalVisibility(show) {
    for (const h of $$("h2")) h.classList.toggle("soft-hidden", !show);
    for (const ul of $$("ul.task-list")) ul.classList.toggle("soft-hidden", !show);
    document.body.classList.toggle("hide-topic-badge", show); // oculta badges en original
  }

  function destroyTable() {
    const wrap = $(`#${ID}-table-wrap`);
    if (wrap) wrap.remove();
  }

  function renderSortedTable() {
    setOriginalVisibility(false);
    destroyTable();

    const filtered = state.hideSolved ? state.data.filter(d => !d.solved) : state.data.slice();
    const sorted = filtered.sort((a, b) => (b.solvedCount ?? -1) - (a.solvedCount ?? -1));

    const wrap = document.createElement("div");
    wrap.id = `${ID}-table-wrap`;

    const tbl = document.createElement("table");
    tbl.id = `${ID}-table`;
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Problema</th>
          <th>Resueltos</th>
          <th>Tópico</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = $("tbody", tbl);

    sorted.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const status = row.solved ? "Full" : (row.totalCount ? "Pending" : "—");

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><a href="${row.url}"></a></td>
        <td>${Number.isInteger(row.solvedCount) ? row.solvedCount : ""}</td>
        <td>${row.topic}</td>
        <td class="${row.solved ? "badge-full" : ""}">${status}</td>
      `;
      // Evita HTML injection en el título
      $("a", tr).textContent = row.title;

      tbody.appendChild(tr);
    });

    wrap.appendChild(tbl);
    const bar = $(`#${ID}-bar`);
    bar.insertAdjacentElement("afterend", wrap);
    bar._updateStats && bar._updateStats();
  }

  function renderBar() {
    if ($(`#${ID}-bar`)) return $(`#${ID}-bar`);

    const bar = document.createElement("div");
    bar.id = `${ID}-bar`;

    const btnSort = document.createElement("button");
    btnSort.textContent = "Ordenar por resoluciones";

    const btnToggle = document.createElement("button");
    btnToggle.textContent = `Ocultar resueltos: ${state.hideSolved ? "ON" : "OFF"}`;

    const btnRestore = document.createElement("button");
    btnRestore.textContent = "Restaurar vista";

    const stat = document.createElement("div");
    stat.className = "stat";

    bar.append(btnSort, btnToggle, btnRestore, stat);

    const matesInput = document.createElement("input");
    matesInput.placeholder = "Compañeros IDs (coma)";
    matesInput.style.minWidth = "220px";
    matesInput.value = localStorage.getItem(`${ID}-team-mates`) || "";

    const btnTeamPaint = document.createElement("button");
    btnTeamPaint.textContent = "Pintar equipo";

    const btnTeamClear = document.createElement("button");
    btnTeamClear.textContent = "Limpiar equipo";

    bar.append(matesInput, btnTeamPaint, btnTeamClear); // <-- antes de stat


    const firstH2 = document.querySelector("h2");
    if (firstH2) firstH2.parentElement.insertBefore(bar, firstH2);
    else document.body.insertAdjacentElement("afterbegin", bar);

    btnSort.onclick = () => { state.mode = "sorted"; renderSortedTable(); };

    btnToggle.onclick = () => {
      state.hideSolved = !state.hideSolved;
      localStorage.setItem(`${ID}-hideSolved`, state.hideSolved ? "1" : "0");
      btnToggle.textContent = `Ocultar resueltos: ${state.hideSolved ? "ON" : "OFF"}`;
      if (state.mode === "sorted") renderSortedTable();
      else { applyHideSolvedOriginal(state.data, state.hideSolved); bar._updateStats && bar._updateStats(); }
    };

    btnRestore.onclick = () => {
      state.mode = "original";
      destroyTable();
      setOriginalVisibility(true);
      applyHideSolvedOriginal(state.data, state.hideSolved);
      bar._updateStats && bar._updateStats();
    };

    btnTeamPaint.onclick = async () => {
      const matesRaw = (matesInput.value || "").trim();
      localStorage.setItem(`${ID}-team-mates`, matesRaw);

      // separa y limpia
      const rawList = matesRaw
        ? Array.from(new Set(
            matesRaw.split(",").map(s => s.trim()).filter(Boolean)
          ))
        : [];

      // resolver cada entrada: si es nombre, busca el ID
      const mateIds = [];
      for (const entry of rawList) {
        const id = await resolveFriendId(entry);
        if (id) mateIds.push(id);
      }

      // Siempre: limpiar DOM pintado previamente y resetear el modelo
      clearTeamPaint();
      resetSolvedToBase();

      // Si no hay IDs -> sólo actualizar UI y salir
      if (mateIds.length === 0) {
        const barEl = document.querySelector(`#${ID}-bar`);
        barEl?._updateStats && barEl._updateStats();
        if (state.mode === "sorted") renderSortedTable();
        return;
      }

      try {
        // Traer sets de resueltos de cada compañero
        const matesSets = await Promise.all(mateIds.map(id => fetchSolvedSet(id)));

        // Unión SOLO de este input (sin arrastre de estados previos)
        const matesUnion = new Set();
        for (const s of matesSets) for (const v of s) matesUnion.add(v);

        // Pintar DOM y actualizar state.data.solved
        paintTeamOnProblemset(matesUnion);

        // Refrescar stats y tabla (si procede)
        const barEl = document.querySelector(`#${ID}-bar`);
        barEl?._updateStats && barEl._updateStats();
        if (state.mode === "sorted") renderSortedTable();

      } catch (e) {
        console.error(e);
        alert("No pude obtener los resueltos. ¿IDs correctos? ¿Sesión activa?");
      }
    };

    btnTeamClear.onclick = () => {
      clearTeamPaint();
      resetSolvedToBase(); // ← opcional, por prolijidad
      const barEl = document.querySelector(`#${ID}-bar`);
      barEl?._updateStats && barEl._updateStats();
      if (state.mode === "sorted") {
        renderSortedTable();
      }
    };


    bar._updateStats = () => {
      const total  = state.data.length;
      const solved = state.data.filter(d => d.solved).length;
      const shown  = state.hideSolved ? total - solved : total;
      stat.textContent = `Mostrando ${shown}/${total} | Resueltos: ${solved}`;
    };

    return bar;
  }

  function initOnce() {
    // ¿Hay contenido ya?
    const hasLists = document.querySelector("ul.task-list");
    const hasH2    = document.querySelector("h2");
    if (!hasLists || !hasH2) return false;

    state.data = extractAll();
    if (!state.data.length) return false;

    ensureTopicBadgesOriginal(state.data);
    const bar = renderBar();
    setOriginalVisibility(true);
    applyHideSolvedOriginal(state.data, state.hideSolved);
    bar._updateStats && bar._updateStats();

    return true;
  }

  // Intento inmediato
  if (initOnce()) return;

  // Observa cambios del DOM para inicializar cuando cargue la lista
  const mo = new MutationObserver(() => {
    if (initOnce()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
