/* ==========================================================================
   Blueprint — under construction
   Séquence : cadre → lignes maîtresses → lignes fines → unités (carrés dans
   des carrés) + repères + cartouche → planche terminée → titre.
   Tous les réglages sont dans CONFIG (durées en ms).
   ========================================================================== */
(() => {
  "use strict";

  const CONFIG = {
    cell: { desktop: 64, mobile: 40, breakpoint: 640 }, // taille d'une cellule (px)
    seed: 7, // change la répartition des unités
    frame: { edge: 350, step: 200, inner: 250 }, // tracé du cadre (par côté / décalage / cadre intérieur)
    lines: { start: 450, duration: 900, stagger: 30, minorGap: 350 }, // lignes maîtresses puis fines, depuis le centre
    units: { duration: 520, stagger: 30 }, // ondulation des carrés depuis le centre
    block: { duration: 650 }, // dépliage du cartouche
    title: { gap: 200, videoDelay: 300 }, // pause avant le titre / délai plaque → vidéo
    pointerRadius: 3.4, // rayon d'effet du pointeur (en cellules)
    zones: { cols: 6, rows: 4 }, // repères A–F / 1–4
  };

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const body = document.body;
  const grid = $("grid");
  const linesEl = $("lines");
  const cellsEl = $("cells");
  const video = $("titleVideo");
  const titleBtn = $("title");
  const crosshair = $("crosshair");
  const tbZone = $("tbZone");

  // Volontairement ignoré : l'intro doit toujours se jouer à l'arrivée sur la page
  const reduceMotion = false;
  const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(
    navigator.userAgent,
  );

  let layout = null;
  let cells = [];
  let timeline = { builtAt: 0, titleAt: 0 };
  let active = new Set();
  let pointer = null;
  let raf = 0;
  let ready = false;
  let zone = { c: -1, r: -1 };
  let zonesX = [];
  let zonesY = [];
  let zoneBox = { x: 0, w: 1, y: 0, h: 1 };

  /* ---------- Aléatoire stable (même motif après un redimensionnement) ---------- */
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* ---------- Construction de la grille + calcul de la chronologie ---------- */
  function build(animate) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size =
      vw < CONFIG.cell.breakpoint ? CONFIG.cell.mobile : CONFIG.cell.desktop;
    const cols = Math.ceil(vw / size) + 2;
    const rows = Math.ceil(vh / size) + 2;

    // Le centre de l'écran tombe sur une intersection de lignes
    const ox = Math.round((vw / 2) % size) - size;
    const oy = Math.round((vh / 2) % size) - size;
    const kc = Math.round((vw / 2 - ox) / size);
    const rc = Math.round((vh / 2 - oy) / size);
    layout = { vw, vh, size, cols, rows, ox, oy };

    const F = CONFIG.frame;
    const L = CONFIG.lines;
    const U = CONFIG.units;

    grid.classList.toggle("static", !animate);
    Object.assign(grid.style, {
      left: ox + "px",
      top: oy + "px",
      width: cols * size + "px",
      height: rows * size + "px",
    });
    grid.style.setProperty("--size", size + "px");
    grid.style.setProperty("--cols", cols);
    grid.style.setProperty("--lines-dur", L.duration + "ms");
    grid.style.setProperty("--units-dur", U.duration + "ms");

    // Lignes : les maîtresses (toutes les 4) d'abord, les fines ensuite
    const majorBase = L.start;
    const minorBase = L.start + L.minorGap;
    const lineFrag = document.createDocumentFragment();
    let maxLineEnd = 0;

    const addLine = (axis, pos, k, kCenter) => {
      const major = (k - kCenter) % 4 === 0;
      const delay =
        (major ? majorBase : minorBase) + Math.abs(k - kCenter) * L.stagger;
      maxLineEnd = Math.max(maxLineEnd, delay + L.duration);
      const el = document.createElement("div");
      el.className = "ln " + axis + (major ? " major" : "");
      el.style[axis === "v" ? "left" : "top"] = pos + "px";
      el.style.setProperty("--delay", delay + "ms");
      lineFrag.append(el);
    };
    for (let k = 0; k <= cols; k++) addLine("v", k * size, k, kc);
    for (let k = 0; k <= rows; k++) addLine("h", k * size, k, rc);
    linesEl.replaceChildren(lineFrag);

    // Cellules : 0 à 3 carrés imbriqués, quelques-unes hachurées
    const unitsStart = minorBase + L.duration * 0.75;
    const cellFrag = document.createDocumentFragment();
    let maxDist = 0;
    cells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = hash(c - kc, r - rc, CONFIG.seed);
        const b = hash(c - kc, r - rc, CONFIG.seed + 1);
        const u = a < 0.3 ? 0 : a < 0.62 ? 1 : a < 0.88 ? 2 : 3;
        const dist = Math.hypot(c + 0.5 - kc, r + 0.5 - rc);
        maxDist = Math.max(maxDist, dist);

        const el = document.createElement("div");
        el.className = "cell";
        el.dataset.u = u;
        if (u > 0 && b < 0.08) el.dataset.h = "";
        el.style.setProperty(
          "--delay",
          Math.round(unitsStart + dist * U.stagger) + "ms",
        );
        el.append(document.createElement("i"));
        cells.push(el);
        cellFrag.append(el);
      }
    }
    cellsEl.replaceChildren(cellFrag);
    active = new Set();

    // Chronologie : la planche est « construite » quand TOUT est posé
    const frameEnd = F.inner + 3 * F.step + F.edge;
    const unitsEnd = unitsStart + maxDist * U.stagger + U.duration + 140;
    const blockStart = Math.max(frameEnd, unitsEnd - 700);
    const builtAt = Math.max(
      frameEnd,
      maxLineEnd,
      unitsEnd,
      blockStart + CONFIG.block.duration,
    );
    timeline = { builtAt, titleAt: builtAt + CONFIG.title.gap };
    measureZones();

    if (animate) {
      root.style.setProperty("--f-edge", F.edge + "ms");
      root.style.setProperty("--f-step", F.step + "ms");
      root.style.setProperty("--f-inner", F.inner + "ms");
      root.style.setProperty("--t-mask", F.inner + "ms");
      root.style.setProperty("--t-zones", Math.max(0, frameEnd - 300) + "ms");
      root.style.setProperty("--t-block", blockStart + "ms");
      root.style.setProperty("--block-dur", CONFIG.block.duration + "ms");
    }
  }

  /* ---------- Repères de zones (cadre) ---------- */
  function buildZones() {
    const { cols, rows } = CONFIG.zones;
    root.style.setProperty("--zc", cols);
    root.style.setProperty("--zr", rows);

    const fill = (host, count, label) => {
      const spans = Array.from({ length: count }, (_, i) => {
        const s = document.createElement("span");
        s.textContent = label(i);
        return s;
      });
      host.replaceChildren(...spans);
      return spans;
    };
    const letter = (i) => String.fromCharCode(65 + i);
    const number = (i) => String(i + 1);

    zonesX = [
      ...fill($("zonesTop"), cols, letter),
      ...fill($("zonesBottom"), cols, letter),
    ];
    zonesY = [
      ...fill($("zonesLeft"), rows, number),
      ...fill($("zonesRight"), rows, number),
    ];
  }

  // Les zones suivent la géométrie réelle des repères, pas tout le viewport
  function measureZones() {
    const t = $("zonesTop").getBoundingClientRect();
    const l = $("zonesLeft").getBoundingClientRect();
    zoneBox = { x: t.left, w: t.width || 1, y: l.top, h: l.height || 1 };
  }

  function setZone(c, r) {
    if (c === zone.c && r === zone.r) return;
    zone = { c, r };
    const { cols, rows } = CONFIG.zones;
    zonesX.forEach((el, i) => el.classList.toggle("on", i % cols === c));
    zonesY.forEach((el, i) => el.classList.toggle("on", i % rows === r));
    tbZone.textContent = c < 0 ? "—" : String.fromCharCode(65 + c) + (r + 1);
  }

  /* ---------- Pointeur : les carrés tournent autour du curseur ---------- */
  function update() {
    raf = 0;
    if (!pointer || !ready) return;

    const { x, y } = pointer;
    const { size, cols, rows, ox, oy } = layout;
    const gx = (x - ox) / size;
    const gy = (y - oy) / size;
    const R = CONFIG.pointerRadius;
    const next = new Set();

    const c0 = Math.max(0, Math.floor(gx - R));
    const c1 = Math.min(cols - 1, Math.ceil(gx + R));
    const r0 = Math.max(0, Math.floor(gy - R));
    const r1 = Math.min(rows - 1, Math.ceil(gy + R));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = 1 - Math.hypot(gx - (c + 0.5), gy - (r + 0.5)) / R;
        if (t <= 0) continue;
        const cell = cells[r * cols + c];
        cell.style.setProperty("--p", (t * t * (3 - 2 * t)).toFixed(3));
        next.add(cell);
      }
    }
    active.forEach((cell) => {
      if (!next.has(cell)) cell.style.removeProperty("--p");
    });
    active = next;

    crosshair.style.translate = x + "px " + y + "px";

    const zc = Math.min(
      CONFIG.zones.cols - 1,
      Math.max(
        0,
        Math.floor(((x - zoneBox.x) / zoneBox.w) * CONFIG.zones.cols),
      ),
    );
    const zr = Math.min(
      CONFIG.zones.rows - 1,
      Math.max(
        0,
        Math.floor(((y - zoneBox.y) / zoneBox.h) * CONFIG.zones.rows),
      ),
    );
    setZone(zc, zr);
  }

  function clearPointer() {
    pointer = null;
    active.forEach((cell) => cell.style.removeProperty("--p"));
    active = new Set();
    crosshair.classList.remove("on");
    setZone(-1, -1);
  }

  document.addEventListener("pointermove", (e) => {
    if (!ready) return;
    pointer = { x: e.clientX, y: e.clientY };
    crosshair.classList.add("on");
    if (!raf) raf = requestAnimationFrame(update);
  });
  root.addEventListener("pointerleave", clearPointer);
  document.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") clearPointer();
  });
  document.addEventListener("pointercancel", clearPointer);

  /* ---------- Titre ---------- */
  function needsFallback() {
    const canPlay =
      video.canPlayType('video/webm; codecs="vp9"') ||
      video.canPlayType('video/mp4; codecs="hvc1"');
    if (!canPlay) return true;
    // Safari ne lit pas l'alpha des .webm : sans source .mov dédiée, on affiche le texte de secours
    return isSafari && !video.dataset.srcSafari;
  }

  function startTitle() {
    body.classList.add("title-on");

    if (needsFallback()) {
      body.classList.add("no-video");
      return;
    }
    setTimeout(() => {
      video.play().catch(() => body.classList.add("no-video"));
    }, CONFIG.title.videoDelay);
  }

  titleBtn.addEventListener("click", () => {
    if (body.classList.contains("no-video")) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  });

  function showLastFrame() {
    video.currentTime = Math.max(0, video.duration - 0.05);
  }

  /* ---------- Cote du titre ---------- */
  const dimValue = $("dimValue");
  const updateDim = () => {
    dimValue.textContent = Math.round(titleBtn.offsetWidth) + " px";
  };
  if ("ResizeObserver" in window)
    new ResizeObserver(updateDim).observe(titleBtn);
  else window.addEventListener("resize", updateDim);

  /* ---------- Contenu du site (config.js, généré depuis l'env en prod) ---------- */
  const site = window.SITE || {};
  document.querySelectorAll("[data-site]").forEach((el) => {
    const value = site[el.dataset.site];
    if (!value) return;
    el.textContent = value;
    if (el.tagName === "A") el.href = "mailto:" + value;
  });
  if (site.title) document.title = site.title;
  if (site.description) {
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", site.description);
  }

  /* ---------- Démarrage ---------- */
  $("tbDate").textContent = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (isSafari && video.dataset.srcSafari) video.src = video.dataset.srcSafari;

  buildZones();
  build(!reduceMotion);
  updateDim();

  if (reduceMotion) {
    body.classList.add("no-motion", "title-on");
    ready = true;
    if (needsFallback()) body.classList.add("no-video");
    else if (video.readyState >= 1) showLastFrame();
    else
      video.addEventListener("loadedmetadata", showLastFrame, { once: true });
  } else {
    // Planche terminée → le pointeur devient actif, puis le titre se déclenche
    setTimeout(() => {
      ready = true;
    }, timeline.builtAt);
    setTimeout(startTitle, timeline.titleAt);
  }

  /* ---------- Redimensionnement (sans rejouer l'intro) ---------- */
  let resizeTimer = 0;
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Ignore la barre d'adresse mobile qui se replie
      if (w === lastW && Math.abs(h - lastH) < 80) return;
      lastW = w;
      lastH = h;
      build(false);
    }, 200);
  });
})();
