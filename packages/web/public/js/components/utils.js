H.groupBy = function(items, keyFn, sortFn, groupSortFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  for (const items of map.values()) { if (sortFn) items.sort(sortFn); }
  const entries = [...map.entries()];
  if (groupSortFn) entries.sort(groupSortFn);
  else entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
};
/**
 * Hackflix Nav — D-pad spatial navigation.
 * No dependencies.
 * @module hackflix-nav
 */
var H = window.Hackflix;

H.initSpatialNav = function(selector) {
  const sel = selector || "a, button, input, select, textarea, [role='button']";
  if (H._spatialNavActive) return;
  H._spatialNavActive = true;

  let cachedElements = null;
  let lastCacheTime = 0;

  function getElements() {
    const now = Date.now();
    if (cachedElements && (now - lastCacheTime) < 500) {
      return cachedElements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
      });
    }
    cachedElements = [...document.querySelectorAll(sel)]
      .filter(el => { const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none"; });
    lastCacheTime = now;
    return cachedElements.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
    });
  }

  function findInDir(rect, candidates, dir) {
    let best = null, bestScore = Infinity;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    for (const { el, rect: cr } of candidates) {
      const tx = cr.left + cr.width / 2, ty = cr.top + cr.height / 2;
      const dx = tx - cx, dy = ty - cy;
      let inDir = (dir === "up" && dy < -1) || (dir === "down" && dy > 1) || (dir === "left" && dx < -1) || (dir === "right" && dx > 1);
      if (!inDir) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const orth = dir === "up" || dir === "down" ? Math.abs(dx) : Math.abs(dy);
      const score = dist + orth * 0.7;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  window.addEventListener("scroll", () => { cachedElements = null; }, { passive: true });
  window.addEventListener("resize", () => { cachedElements = null; }, { passive: true });
  document.addEventListener("visibilitychange", () => { cachedElements = null; });

  document.addEventListener("keydown", e => {
    if (!H._spatialNavActive) return;
    const dirs = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const dir = dirs[e.key];
    if (dir) {
      e.preventDefault();
      const elements = getElements();
      if (!elements.length) return;
      const active = document.activeElement;
      const current = elements.includes(active) ? active : elements[0];
      const next = findInDir(current.getBoundingClientRect(), elements.filter(el => el !== current).map(el => ({ el, rect: el.getBoundingClientRect() })), dir);
      if (next) { next.focus({ preventScroll: false }); next.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }
    if (e.key === "Enter" || e.key === " ") {
      const active = document.activeElement;
      const elements = getElements();
      if (active && elements.includes(active)) {
        e.preventDefault();
        if (!/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) active.click();
      }
    }
  });

  setTimeout(() => {
    const elements = getElements();
    if (elements.length > 0 && (!document.activeElement || document.activeElement === document.body)) {
      elements[0].setAttribute("tabindex", "0");
    }
  }, 500);
};

/**
 * Hackflix Cards — shared card renderer.
 */
var H = window.Hackflix;

H.renderCard = function(item, opts) {
  opts = opts || {};
  var subtitle = item.duration ? item.duration + " min" : "";
  if (opts.showYear && item.year) subtitle += " \u2022 " + item.year;
  if (opts.showConference && item.conference) subtitle += " \u2022 " + H.escapeHtml(item.conference);
  else if (opts.showConference && item.source) subtitle += " \u2022 " + H.escapeHtml(item.source);
  return '<a href="/watch/?id=' + encodeURIComponent(item.id) + '" class="movie-card">' +
    '<img src="' + H.getThumbnailUrl(item.thumbnail, item.title) + '" alt="' + H.escapeHtml(item.title) + '" width="360" height="203" loading="lazy" />' +
    '<div class="movie-card-overlay"><h3>' + H.escapeHtml(item.title) + '</h3><p>' + subtitle + '</p></div></a>';
};

/**
 * Hackflix Auth — authentication gate.
 */
H._authPromise = null;
H.authenticate = async function() {
  if (H._authPromise) return H._authPromise;
  H._authPromise = (async () => {
    try {
      const res = await fetch(H.API_BASE + "/api/auth/verify", {
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        var user = await res.json();
        localStorage.setItem("hackflix_user", JSON.stringify(user));
        return user;
      }
    } catch {}
    localStorage.removeItem("hackflix_user");
    window.location.href = "/login";
    throw new Error("AUTH_REQUIRED");
  })();
  return H._authPromise;
};

if (window.location.pathname !== "/login") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => H.authenticate(), 0);
  });
}

/**
 * Hackflix Utils — groupBy.
 */
H.groupBy = function(items, keyFn, sortFn, groupSortFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  for (const items of map.values()) { if (sortFn) items.sort(sortFn); }
  const entries = [...map.entries()];
  if (groupSortFn) entries.sort(groupSortFn);
  else entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
};