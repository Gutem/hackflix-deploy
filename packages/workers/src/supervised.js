/**
 * Supervised ingest - interactive conference-by-conference ingestion.
 * Preview each conference's editions before deciding to ingest.
 * @module packages/workers/src/supervised
 */

import * as infocon from "../../shared/lib/connectors/infocon.js";

/**
 * Preview all available conferences with their edition counts.
 * @returns {Promise<Array<{name: string, path: string, editions: number, years: number[]}>>}
 */
export async function previewConferences() {
  const confs = await infocon.listConferences();

  console.log(`\nScanning ${confs.length} conferences for editions...\n`);

  const results = [];

  const BATCH = 5;
  for (let i = 0; i < confs.length; i += BATCH) {
    const batch = confs.slice(i, i + BATCH);
    const previews = await Promise.all(
      batch.map(async (conf) => {
        try {
          const editions = await infocon.fetchConferenceEditions(`/${conf.path}`);
          const years = editions.filter(e => e.year).map(e => e.year).sort((a, b) => b - a);
          return { name: conf.name, path: conf.path, editions: editions.length, years };
        } catch {
          return { name: conf.name, path: conf.path, editions: 0, years: [] };
        }
      })
    );
    results.push(...previews);

    process.stdout.write(`\rScanned ${Math.min(i + BATCH, confs.length)}/${confs.length}...`);
  }

  console.log("\rScan complete.                      ");
  return results;
}

/**
 * Fetch all editions for a conference.
 * @param {Object} conf - Conference with {name, path}
 * @param {Function} onItem - Called for each batch of fetched items
 * @param {number} [limit=9999]
 * @returns {Promise<Object>} { added, errors }
 */
export async function ingestConference(conf, onItem, limit = 9999) {
  const results = [];
  const errors = [];

  const editions = await infocon.fetchConferenceEditions(`/${conf.path}`);
  const sorted = editions
    .filter(e => e.year)
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  for (const ed of sorted) {
    if (results.length >= limit) break;
    try {
      const remaining = limit - results.length;
      const name = `${conf.name} ${ed.year || ed.name}`;
      const videos = await infocon.fetchConferenceEdition(ed.path, name, ed.year, remaining);
      results.push(...videos);
      if (videos.length > 0 && onItem) {
        await onItem(videos);
      }
    } catch (e) {
      errors.push({ edition: ed.name, error: e.message });
    }
  }

  return { added: results.length, errors };
}
