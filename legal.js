/* Pages légales : remplit les [data-site] depuis config.js (utile en dev local, sans conteneur) */
(() => {
  "use strict";

  const site = window.SITE || {};
  document.querySelectorAll("[data-site]").forEach((el) => {
    const value = site[el.dataset.site];
    if (!value) return;
    el.textContent = value;
    if (el.tagName === "A") el.href = "mailto:" + value;
  });
})();
