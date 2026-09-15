/**
 * Conference API handlers — list, editions, content.
 * @module packages/backend/src/routes/api/conferences
 */

import { json, findConference } from "../../lib/response.js";

/** @param {import('../../../ingest/src/conferences-store.js').ConferencesStore} conferencesStore @param {import('../../services/content.js').ContentService} contentService */
export function handleGetConferences(conferencesStore, contentService) {
  const conferences = conferencesStore ? conferencesStore.getAll() : [];

  if (contentService && conferences.length > 0) {
    const counts = contentService.getConferenceStats();
    for (const conf of conferences) {
      const key = conf.name.toLowerCase();
      const stats = counts.get(key);
      conf.editions = stats ? stats.editions.size : 0;
      conf.count = stats ? stats.count : 0;
    }
  }

  return json({ conferences, total: conferences.length });
}

/** @param {string} confPath @param {import('../../../ingest/src/conferences-store.js').ConferencesStore} conferencesStore */
export function handleGetConferenceEditions(confPath, conferencesStore) {
  const conf = findConference(conferencesStore, confPath);
  if (!conf) return json({ error: "Conference not found" }, 404);
  return json({ conference: conf, editions: [] });
}

/** @param {string} confSlug @param {import('../../../ingest/src/conferences-store.js').ConferencesStore} conferencesStore @param {import('../../services/content.js').ContentService} contentService @param {Object} user */
export function handleGetConferenceContent(confSlug, conferencesStore, contentService, user) {
  const conf = findConference(conferencesStore, confSlug);
  if (!conf) return json({ error: "Conference not found" }, 404);
  const items = contentService.getContentByConference(conf.name, conf.path, user);
  return json({ conference: conf, items, total: items.length });
}
