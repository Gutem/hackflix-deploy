/**
 * Static file server middleware.
 * @module packages/backend/src/lib/static
 */

import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
};

/** @type {Record<string, string>} URL path → filesystem path of .html file */
const PAGE_ROUTES = {
  "/": "index.html",
  "/login/": "login.html",
  "/watch/": "watch.html",
  "/conferences/": "conferences.html",
  "/conference/": "conference.html",
  "/documentaries/": "documentaries.html",
  "/documentary/": "documentary.html",
  "/topic/": "topic.html",
  "/search/": "search.html",
  "/profile/": "profile.html",
  "/login": "login.html",
  "/watch": "watch.html",
  "/conferences": "conferences.html",
  "/conference": "conference.html",
  "/documentaries": "documentaries.html",
  "/documentary": "documentary.html",
  "/topic": "topic.html",
  "/search": "search.html",
  "/profile": "profile.html",
};

/**
 * @param {string} publicDir - Absolute path to public/ directory
 */
export function createStaticHandler(publicDir) {
  /**
   * @param {string} pathname - URL pathname
   * @returns {Response|null} Response or null if not found
   */
  function serve(pathname) {
    const route = PAGE_ROUTES[pathname];
    if (route) return serveFile(join(publicDir, route));

    const safePath = pathname.replace(/\.\./g, "").replace(/\/\//g, "/");
    const filePath = join(publicDir, safePath);

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return serveFile(filePath);
    }

    return null;
  }

  /**
   * @param {string} filePath
   * @returns {Response}
   */
  function serveFile(filePath) {
    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";

      return new Response(content, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    } catch {
      return null;
    }
  }

  return { serve };
}
