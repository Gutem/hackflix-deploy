/**
 * Content API handlers — playlist, detail, search.
 * @module packages/backend/src/routes/api/content
 */

import { json } from "../../lib/response.js";

/** @param {Request} req @param {Object} user @param {import('../../services/content.js').ContentService} contentService */
export function handleGetPlaylist(req, user, contentService) {
  const url = new URL(req.url);
  const options = {
    source: url.searchParams.get("source") || undefined,
    conference: url.searchParams.get("conference") || undefined,
    limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")) : undefined,
    offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")) : undefined,
  };
  return json(contentService.getPlaylist(user, options));
}

/** @param {string} contentId @param {Object} user @param {import('../../services/content.js').ContentService} contentService */
export function handleGetContent(contentId, user, contentService) {
  const content = contentService.getContent(contentId, user);
  if (!content) {
    return json({ error: "Content not found or no access" }, 404);
  }
  return json(content);
}

/** @param {Request} req @param {Object} user @param {import('../../services/content.js').ContentService} contentService */
export function handleSearch(req, user, contentService) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";
  const limit = url.searchParams.get("limit");
  const parsedLimit = limit !== null ? parseInt(limit) : 20;
  const safeLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  return json({ results: contentService.search(query, user, { limit: safeLimit }) });
}
