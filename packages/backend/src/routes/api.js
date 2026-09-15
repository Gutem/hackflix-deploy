/**
 * API Router — thin dispatch layer.
 * @module packages/backend/src/routes/api
 */

import { handleLogin, handleVerify, handleGetMe, handleLogout } from "./api/auth.js";
import { handleGetPlaylist, handleGetContent, handleSearch } from "./api/content.js";
import { handleGetConferences, handleGetConferenceEditions, handleGetConferenceContent } from "./api/conferences.js";
import { handleGetSubtitles, handleProxyVideo, handleProxyImage, maybeCompress } from "./api/proxy.js";
import { json } from "../lib/response.js";

/**
 * Create API router.
 * @param {Object} options
 * @param {import('../services/content.js').ContentService} options.contentService
 * @param {import('../services/user-store.js').UserStore} options.userStore
 * @param {string} options.jwtSecret
 * @param {import('../../../ingest/src/conferences-store.js').ConferencesStore} options.conferencesStore
 * @returns {Function}
 */
export function createApiRouter(options) {
  const { contentService, userStore, jwtSecret, conferencesStore } = options;

  return async (req, context) => {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, "");
    const user = context.user;

    let response;

    // Login and logout are unauthenticated routes
    if (req.method === "POST" && path === "/auth/login") {
      return maybeCompress(await handleLogin(req, userStore, jwtSecret), req);
    }
    if (req.method === "POST" && path === "/auth/logout") {
      return handleLogout();
    }

    // Proxy routes are public (validate domain, no auth needed)
    if (req.method === "GET" && path === "/proxy/video") {
      return await handleProxyVideo(req);
    }
    if (req.method === "GET" && path === "/proxy/image") {
      return await handleProxyImage(req);
    }

    // All other API routes require authentication
    if (!user) {
      return json({ error: "Authentication required" }, 401);
    }

    if (req.method === "GET" && path === "/auth/verify") {
      response = handleVerify(user);
    } else if (req.method === "GET" && path === "/playlist" || req.method === "GET" && path === "/content") {
      response = handleGetPlaylist(req, user, contentService);
    } else if (req.method === "GET" && path.startsWith("/content/")) {
      response = handleGetContent(decodeURIComponent(path.replace("/content/", "")), user, contentService);
    } else if (req.method === "GET" && path === "/search") {
      response = handleSearch(req, user, contentService);
    } else if (req.method === "GET" && path === "/me") {
      response = handleGetMe(user);
    } else if (req.method === "GET" && path === "/me/key") {
      const full = userStore.get(user.id);
      response = json({ apiKeyPreview: full?.apiKeyPreview || null });
    } else if (req.method === "POST" && path === "/me/regenerate-key") {
      const result = userStore.regenerateApiKey(user.id);
      if (!result) response = json({ error: "Failed to regenerate key" }, 500);
      else { userStore.persist(); response = json(result); }
    } else if (req.method === "GET" && path === "/subtitles") {
      response = handleGetSubtitles(req, user);
    } else if (req.method === "GET" && (path === "/conferences" || path === "/conference")) {
      response = handleGetConferences(conferencesStore, contentService);
    } else if (req.method === "GET" && path.startsWith("/conferences/") && path.endsWith("/editions")) {
      response = handleGetConferenceEditions(path.replace("/conferences/", "").replace("/editions", ""), conferencesStore);
    } else if (req.method === "GET" && path.startsWith("/conferences/") && path.endsWith("/content")) {
      response = handleGetConferenceContent(path.replace("/conferences/", "").replace("/content", ""), conferencesStore, contentService, user);
    } else if (req.method === "GET" && path.startsWith("/conference/")) {
      response = handleGetConferenceContent(path.replace("/conference/", ""), conferencesStore, contentService, user);
    } else {
      response = new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return maybeCompress(await response, req);
  };
}
