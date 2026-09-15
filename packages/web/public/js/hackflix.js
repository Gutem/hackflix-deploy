/**
 * Hackflix core — API, auth, user.
 * Loaded first, all other modules depend on this.
 * @module hackflix-core
 */
if (!window.Hackflix) window.Hackflix = {};
var H = window.Hackflix;

H.API_BASE = "";

H.authHeaders = function() {
  return {};
};

H.apiFetch = async function(path) {
  const res = await fetch(`${H.API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  if (H.redirectIfUnauthorized(res)) return null;
  if (!res.ok) return null;
  return res.json();
};

H.redirectIfUnauthorized = function(res) {
  if (res.status === 401) {
    window.location.href = "/login";
    return true;
  }
  return false;
};

H.getUser = function() {
  try { return JSON.parse(localStorage.getItem("hackflix_user")); } catch { return null; }
};

H.isPremium = function() {
  const u = H.getUser();
  return u && (u.tier === "premium" || u.tier === "admin");
};
/**
 * Hackflix UI — escaping, thumbnails, formatting, image proxy.
 * Depends on hackflix-core.js
 * @module hackflix-ui
 */
var H = window.Hackflix;

H.escapeHtml = function(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

H.getThumbnailUrl = function(thumbnail, title) {
  if (thumbnail && thumbnail.trim()) return thumbnail;
  const initials = (title || "??")
    .split(/[\s\-_:]+/).filter(Boolean).slice(0, 2)
    .map(w => [...w][0]?.toUpperCase() || "").join("");
  const escaped = H.escapeHtml(initials);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="203" viewBox="0 0 360 203"><rect width="360" height="203" fill="#1a1a2e"/><rect x="0" y="199" width="360" height="4" fill="#e50914" opacity="0.8"/><text x="180" y="101" font-family="system-ui,sans-serif" font-size="48" font-weight="700" fill="#e50914" text-anchor="middle" dominant-baseline="central">${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

H.formatDuration = function(minutes) {
  if (minutes == null || minutes <= 0) return "";
  if (minutes >= 60) { const h = Math.floor(minutes / 60); const m = minutes % 60; return m > 0 ? `${h}h ${m}m` : `${h}h`; }
  return `${minutes} min`;
};

H.formatDurationSeconds = function(seconds) {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

H.needsImageProxy = function(url) {
  return url && url.includes("infocon.org") && !url.includes("base64");
};

H.getImageSrc = function(url) {
  if (!url) return "";
  if (H.needsImageProxy(url)) return `${H.API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
  return url;
};

H.needsProxy = function(source) {
  return ["defcon", "infocon", "archive.org", "ccc"].includes(source);
};
/**
 * Hackflix Video — video init, watch progress.
 * Depends on hackflix-core.js
 * @module hackflix-video
 */
var H = window.Hackflix;

H.getVideoSrc = function(url, source) {
  if (!url) return "";
  if (H.needsProxy(source)) return `${H.API_BASE}/api/proxy/video?url=${encodeURIComponent(url)}`;
  return url;
};

H.initVideo = function(video, url, source) {
  const videoUrl = H.getVideoSrc(url, source);
  if (typeof Hls !== "undefined" && videoUrl.endsWith(".m3u8")) {
    const hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(video);
  } else {
    video.src = videoUrl;
  }
};

H.trackWatchProgress = function(id, title, thumbnail, currentTime, duration) {
  const key = "hackflix_watch_progress";
  let progress;
  try { progress = JSON.parse(localStorage.getItem(key)) || {}; } catch { progress = {}; }
  progress[id] = { id, title, thumbnail, currentTime, duration, ts: Date.now() };
  const entries = Object.values(progress).sort((a, b) => b.ts - a.ts).slice(0, 50);
  const slim = {};
  for (const e of entries) slim[e.id] = e;
  localStorage.setItem(key, JSON.stringify(slim));
};

H.getContinueWatching = function() {
  try {
    const raw = JSON.parse(localStorage.getItem("hackflix_watch_progress")) || {};
    return Object.values(raw)
      .filter(e => e.currentTime > 5 && e.currentTime < e.duration * 0.9)
      .sort((a, b) => b.ts - a.ts).slice(0, 10)
      .map(e => ({ ...e, progress: Math.round((e.currentTime / e.duration) * 100) }));
  } catch { return []; }
};
/**
 * Hackflix Topics — content categorization.
 * Depends on hackflix-core.js
 * @module hackflix-topics
 */
var H = window.Hackflix;

H._cachedTopics = [
  { topic: "IoT & Embedded", keywords: [/\bIoT\b/i, /\bembedded\b/i, /\bESP32\b/i, /\bArduino\b/i, /\bfirmware\b/i, /\bSCADA\b/i, /\bICS\b/i, /\bPLC\b/i, /\bOT\b\s+security/i] },
  { topic: "Reverse Engineering", keywords: [/\breverse\s*engineer/i, /\bdisassembl/i, /\bdecompil/i, /\bunpack/i, /\bbinary\b/i, /\bghidra\b/i, /\bIDA\s?Pro/i, /\bradare/i] },
  { topic: "Exploitation", keywords: [/\bexploit/i, /\bROP\b/i, /\bbuffer\s*overflow/i, /\buse.after.free\b/i, /\bheap\b/i, /\bshellcode/i, /\bbypass\b/i, /\bescalat/i, /\bprivilege\b/i] },
  { topic: "Web Security", keywords: [/\bweb\b/i, /\bXSS\b/i, /\bCSRF\b/i, /\bSQL\s?[iI]njection/i, /\bSSRF\b/i, /\bSOP\b/i, /\bCORS\b/i, /\bbrowser\b/i, /\bDOM\b/i, /\bJavaScript\b/i, /\bOAuth\b/i] },
  { topic: "Linux & Kernel", keywords: [/\blinux\b/i, /\bkernel\b/i, /\beBPF\b/i, /\bsyscall/i, /\bLKM\b/i, /\brootkit\b/i, /\bcontainer\b/i, /\bdocker\b/i, /\bkubernetes\b/i] },
  { topic: "Windows & AD", keywords: [/\bwindows\b/i, /\bactive\s*directory\b/i, /\bAD\b/i, /\bKerberos\b/i, /\bNTLM\b/i, /\bPowerShell\b/i, /\b\.NET\b/i, /\bwin32/i] },
  { topic: "macOS & iOS", keywords: [/\bmacOS\b/i, /\biOS\b/i, /\biphone\b/i, /\bXNU\b/i, /\bapple\b/i, /\bswift\b/i, /\bobjective.c\b/i, /\bARM64?\b/i] },
  { topic: "Android & Mobile", keywords: [/\bandroid\b/i, /\bAPK\b/i, /\bSMS\b/i, /\bbluetooth\b/i, /\bBLE\b/i, /\bNFC\b/i, /\bRFID\b/i, /\b5G\b/i, /\bLTE\b/i, /\bcellular\b/i, /\bSIM\b/i] },
  { topic: "Cryptography", keywords: [/\bcrypto/i, /\bencrypt/i, /\bTLS\b/i, /\bSSL\b/i, /\bRSA\b/i, /\bAES\b/i, /\bSHA\b/i, /\bhash\b/i, /\bcertificate\b/i, /\bPKI\b/i, /\bECDSA\b/i, /\bpost.quantum\b/i] },
  { topic: "AI & ML", keywords: [/\bAI\b/i, /\bLLM\b/i, /\bGPT\b/i, /\bmachine\s*learning\b/i, /\bneural\b/i, /\bdeep\s*learning\b/i, /\btransformer\b/i, /\badversarial\b/i, /\bprompt\b.*inject/i] },
  { topic: "Network Security", keywords: [/\bnetwork\b/i, /\bDNS\b/i, /\bTCP\b/i, /\bUDP\b/i, /\bHTTP\b/i, /\bproxy\b/i, /\bfirewall\b/i, /\bVPN\b/i, /\bBGP\b/i, /\bpacket\b/i, /\brouter\b/i, /\bswitch\b/i] },
  { topic: "Hardware Hacking", keywords: [/\bhardware\b/i, /\bPCB\b/i, /\bJTAG\b/i, /\bUART\b/i, /\bSPI\b/i, /\bI2C\b/i, /\boscilloscope\b/i, /\blogic\s*analyzer\b/i, /\bsoldering\b/i] },
  { topic: "Cloud Security", keywords: [/\bcloud\b/i, /\bAWS\b/i, /\bAzure\b/i, /\bGCP\b/i, /\bS3\b/i, /\bIAM\b/i, /\bserverless\b/i, /\bmicroservice\b/i] },
  { topic: "Privacy", keywords: [/\bprivacy\b/i, /\banonym/i, /\bTor\b/i, /\bVPN\b/i, /\bGDPR\b/i, /\bsurveillance\b/i, /\btracking\b/i, /\bfingerprint/i] },
  { topic: "Social Engineering", keywords: [/\bsocial\s*engineer/i, /\bphish/i, /\bOSINT\b/i, /\brecon/i, /\bimpersonat/i] },
];

H.getTopics = function() { return H._cachedTopics; };

H.categorizeTopics = function(items) {
  const map = new Map();
  for (const item of items) {
    const text = (item.title || "") + " " + (item.description || "");
    for (const { topic, keywords } of H._cachedTopics) {
      if (keywords.some(k => k.test(text))) {
        if (!map.has(topic)) map.set(topic, []);
        map.get(topic).push(item);
        break;
      }
    }
  }
  return [...map.entries()].sort(([, a], [, b]) => b.length - a.length);
};
/**
 * Hackflix Utils — groupBy.
 * No dependencies.
 * @module hackflix-utils
 */
var H = window.Hackflix;

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

// Stop video/audio on navigation
document.addEventListener("htmx:beforeSwap", () => {
  document.querySelectorAll("video, audio").forEach(function (el) {
    el.pause();
    el.removeAttribute("src");
    el.load();
  });
});

// Sync nav active state
function syncActiveNav() {
  var path = window.location.pathname;
  document.querySelectorAll(".site-nav a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var match = path === href ||
      (href !== "/" && path.startsWith(href)) ||
      (href === "/conferences/" && path.startsWith("/conference/")) ||
      (href === "/documentaries/" && path.startsWith("/documentary/"));
    a.classList.toggle("active", match);
  });
}
document.addEventListener("DOMContentLoaded", syncActiveNav);
document.addEventListener("htmx:afterSettle", syncActiveNav);
