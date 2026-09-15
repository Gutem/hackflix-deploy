/**
 * Built-in connectors that wrap shared lib connectors for the ingest pipeline.
 * @module packages/workers/src/connectors
 */

import { MediaCCCConnector } from "../../shared/lib/connectors/media-ccc.js";
import * as peertube from "../../shared/lib/connectors/peertube.js";
import * as defcon from "../../shared/lib/connectors/defcon.js";
import * as infocon from "../../shared/lib/connectors/infocon.js";
import * as youtube from "../../shared/lib/connectors/youtube.js";

import * as ted from "../../shared/lib/connectors/ted.js";

/**
 * @typedef {{ fetchAll: (options?: Object) => Promise<Array<Object>> }} Connector
 */

/**
 * Create CCC connector for pipeline.
 * @param {Object} [options]
 * @param {string[]} [options.conferences] - Conference acronyms to fetch
 * @param {number} [options.limitPerConference=20] - Max items per conference
 * @returns {Connector}
 */
export function createCCCConnector(options = {}) {
  const conferences = options.conferences || ["39c3", "38c3", "37c3", "36c3", "35c3"];
  const limitPerConference = options.limitPerConference || 20;
  const client = new MediaCCCConnector();

  return {
    fetchAll: async (opts = {}) => {
      const items = [];
      const confs = opts.conference ? [opts.conference] : conferences;
      const limit = opts.limit || limitPerConference;

      const results = await Promise.all(
        confs.map(acronym => client.getEventsWithRecordings(acronym, { limit }))
      );
      for (const events of results) {
        for (const event of events) {
          items.push(client.toMovieFormat(event));
        }
      }
      return items;
    },
  };
}

/**
 * Create PeerTube connector for pipeline.
 * @param {Object} [options]
 * @param {number} [options.limit=50] - Max videos to fetch
 * @returns {Connector}
 */
export function createPeerTubeConnector(options = {}) {
  const defaultLimit = options.limit || 50;

  return {
    fetchAll: async (opts = {}) => {
      const limit = opts.limit || defaultLimit;
      const list = await peertube.fetchVideos({ count: limit });

      const results = await Promise.all(
        list.slice(0, limit).map(async (video) => {
          const fullVideo = await peertube.fetchVideo(video.uuid);
          return fullVideo ? peertube.transformVideo(fullVideo) : null;
        })
      );
      return results.filter(Boolean);
    },
  };
}

/**
 * Create DEF CON connector for pipeline (fetches from media.defcon.org).
 * @param {Object} [options]
 * @param {number[]} [options.years] - DEF CON year numbers to fetch (e.g., [32, 31, 30])
 * @param {number} [options.limit=50] - Max videos total
 * @returns {Connector}
 */
export function createDefConConnector(options = {}) {
  const years = options.years || [32, 31, 30];
  const defaultLimit = options.limit || 50;

  return {
    fetchAll: async (opts = {}) => {
      const limit = opts.limit || defaultLimit;
      const perYear = Math.ceil(limit / years.length);
      const results = await Promise.all(
        years.map(year => defcon.fetchDefConYear(year, perYear))
      );
      return results.flat().slice(0, limit);
    },
  };
}

/**
 * Create InfoCon connector for pipeline (non-DEF CON, non-CCC conferences from infocon.org).
 * Dynamically discovers all conferences, fetches ALL editions and videos.
 * Writes failed editions to ingest-retry.log for later retry.
 * @param {Object} [options]
 * @param {number} [options.limit=500] - Max videos total
 * @param {string} [options.dataDir] - Data directory for retry log
 * @returns {Connector}
 */
export function createInfoConConnector(options = {}) {
  const defaultLimit = options.limit || 500;

  return {
    fetchAll: async (opts = {}) => {
      const limit = opts.limit || defaultLimit;
      const onProgress = opts.onProgress;

const confs = await infocon.listConferences();
      console.log(`InfoCon: ${confs.length} conferences to process`);

      const results = [];
      const failed = [];

      for (const conf of confs) {
        if (results.length >= limit) break;

        let editions;
        try {
          editions = await infocon.fetchConferenceEditions(`/${conf.path}`);
          editions = editions
            .filter(e => e.year)
            .sort((a, b) => (b.year || 0) - (a.year || 0));
        } catch (e) {
          console.log(`InfoCon: ${conf.name} - edition discovery failed: ${e.message}`);
          failed.push({ path: conf.path, name: conf.name, edition: "discovery", error: e.message });
          continue;
        }

        console.log(`InfoCon: ${conf.name} → ${editions.length} editions`);

        for (const ed of editions) {
          if (results.length >= limit) break;
          try {
            const remaining = limit - results.length;
            const name = `${conf.name} ${ed.year || ed.name}`;
            const videos = await infocon.fetchConferenceEdition(ed.path, name, ed.year, remaining);
            results.push(...videos);
            if (videos.length > 0) {
              console.log(`InfoCon: ${conf.name}/${ed.name} → ${videos.length} videos`);
            }
          } catch (e) {
            console.log(`InfoCon: ${conf.name}/${ed.name} FAILED: ${e.message}`);
            failed.push({ path: ed.path, name: conf.name, edition: ed.name, error: e.message });
          }
        }

        if (results.length > 0 && onProgress) {
          await onProgress(results.splice(0));
        }
      }

      if (failed.length > 0 && opts.dataDir) {
        const { writeFileSync } = await import("fs");
        const logPath = `${opts.dataDir}/ingest-retry.log`;
        const lines = failed.map(f => `${f.path} | ${f.name} / ${f.edition} | ${f.error}`).join("\n");
        writeFileSync(logPath, lines + "\n");
        console.log(`InfoCon: ${failed.length} failures written to ingest-retry.log`);
      }

      console.log(`InfoCon: fetch complete - ${results.length} remaining items`);
      return results;
    },
  };
}

/**
 * Create YouTube connector for pipeline.
 * @param {Object} [options]
 * @param {string} [options.playlistId] - YouTube playlist ID or URL
 * @param {number} [options.limit=50] - Max videos to fetch
 * @returns {Connector}
 */
export function createYouTubeConnector(options = {}) {
  const playlistId = options.playlistId;
  const defaultLimit = options.limit || 50;

  return {
    fetchAll: async (opts = {}) => {
      const limit = opts.limit || defaultLimit;
      const playlist = opts.playlistId || playlistId;

      if (!playlist) {
        console.warn("YouTube connector: no playlistId specified");
        return [];
      }

      return youtube.fetchPlaylist(playlist, { limit, conference: opts.conference, playlist: opts.playlist });
    },
  };
}

/**
 * Create TED connector for pipeline.
 * @param {Object} [options]
 * @param {string[]} [options.talkUrls] - TED/TEDx talk URLs to fetch
 * @param {string} [options.event] - Event name for conference field
 * @param {number} [options.year] - Year
 * @returns {Connector}
 */
export function createTedConnector(options = {}) {
  const talkUrls = options.talkUrls || [];
  const event = options.event;
  const year = options.year;

  return {
    fetchAll: async (opts = {}) => {
      const urls = opts.talkUrls || talkUrls;
      if (!urls.length) return [];
      return ted.fetchTalks(urls, { event, year });
    },
  };
}

/**
 * Get all built-in connectors.
 * @param {Object} [options]
 * @returns {Map<string, Connector>}
 */
export function createBuiltinConnectors(options = {}) {
  const connectors = new Map();
  connectors.set("ccc", createCCCConnector(options.ccc));
  connectors.set("peertube", createPeerTubeConnector(options.peertube));
  connectors.set("defcon", createDefConConnector(options.defcon));
  connectors.set("infocon", createInfoConConnector(options.infocon));
  connectors.set("youtube", createYouTubeConnector(options.youtube));
  connectors.set("ted", createTedConnector(options.ted));
  return connectors;
}
