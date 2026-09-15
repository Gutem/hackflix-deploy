/**
 * YouTube connector using yt-dlp for playlist extraction.
 * @module packages/shared/lib/connectors/youtube
 */

import { buildContentItem } from "./content-item.js";

/** Known YouTube playlist → conference name mapping. */
export const PLAYLIST_CONFERENCE_MAP = {
  "defcamp": "DefCamp", "bsidessf": "BSidesSF", "bsidesnyc": "BSidesNYC",
  "bsideslv": "BSidesLV", "bsides boston": "BSides Boston",
  "hitb": "HITB", "hack in the box": "HITB", "nullcon": "Nullcon",
  "black hat": "Black Hat", "blackhat": "Black Hat", "rootcon": "ROOTCON",
};

/**
 * Extract playlist ID from various YouTube URL formats.
 * @param {string} input - YouTube URL or playlist ID
 * @returns {string|null}
 */
export function extractPlaylistId(input) {
  if (!input) return null;

  if (/^PL[a-zA-Z0-9_-]{16,}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const listParam = url.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    if (/^PL[a-zA-Z0-9_-]+$/.test(input)) {
      return input;
    }
  }

  return null;
}

/**
 * Build YouTube video URL from ID.
 * @param {string} videoId
 * @returns {string}
 */
export function buildVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Parse a single line of yt-dlp output.
 * Format (5 fields): id|duration|channel|upload_date|title
 * Format (4 fields, legacy): id|duration|channel|title
 * Title is last to handle pipes in title.
 * @param {string} line
 * @returns {Object|null}
 */
export function parseYtDlpOutput(line) {
  if (!line) return null;

  const pipeIndex = line.indexOf("|");
  if (pipeIndex === -1) return null;

  const id = line.slice(0, pipeIndex);
  const rest = line.slice(pipeIndex + 1);

  const secondPipe = rest.indexOf("|");
  if (secondPipe === -1) return null;

  const durationStr = rest.slice(0, secondPipe);
  const afterDuration = rest.slice(secondPipe + 1);

  const thirdPipe = afterDuration.indexOf("|");
  if (thirdPipe === -1) return null;

  const channel = afterDuration.slice(0, thirdPipe);
  const afterChannel = afterDuration.slice(thirdPipe + 1);

  const fourthPipe = afterChannel.indexOf("|");
  let dateStr = "";
  let title = "";

  if (fourthPipe === -1) {
    // Legacy 4-field format: id|duration|channel|title
    title = afterChannel;
  } else {
    // 5-field format: id|duration|channel|upload_date|title
    dateStr = afterChannel.slice(0, fourthPipe);
    title = afterChannel.slice(fourthPipe + 1);
  }

  if (!id || !title) return null;

  const duration = durationStr ? Math.floor(parseInt(durationStr, 10) / 60) : 0;
  const speakers = channel ? [channel] : [];
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : new Date().getFullYear();

  return buildContentItem(
    {
      id: `youtube-${id}`,
      title,
      source: "youtube",
      videoUrl: buildVideoUrl(id),
    },
    {
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      poster: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      duration,
      year,
      speakers,
      conference: channel || "YouTube",
      channel: channel || "",
      frontendUrl: buildVideoUrl(id),
    }
  );
}

/**
 * Fetch playlist videos using yt-dlp.
 * @param {string} playlistIdOrUrl - YouTube playlist URL or ID
 * @param {Object} [options]
 * @param {number} [options.limit=50] - Max videos to fetch
 * @returns {Promise<Array<Object>>}
 */
export async function fetchPlaylist(playlistIdOrUrl, options = {}) {
  const playlistId = extractPlaylistId(playlistIdOrUrl);
  if (!playlistId) {
    throw new Error(`Invalid YouTube playlist: ${playlistIdOrUrl}`);
  }

  const limit = options.limit || 50;
  const playlistName = options.playlist || options.conference || "";
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

  // Fetch playlist title to extract event year (flat mode, fast)
  let playlistTitle = playlistName;
  if (!playlistTitle) {
    try {
      const titleProc = Bun.spawn([
        "yt-dlp",
        "--flat-playlist",
        "--playlist-end", "1",
        "--print", "playlist_title",
        playlistUrl,
      ], { stdout: "pipe", stderr: "pipe" });
      const titleOut = await new Response(titleProc.stdout).text();
      playlistTitle = titleOut.trim();
      await titleProc.exited;
    } catch { /* keep empty */ }
  }

  try {
    const proc = Bun.spawn([
      "yt-dlp",
      "--ignore-errors",
      "--playlist-end", String(limit),
      "--print", "%(id)s|%(duration)s|%(channel)s|%(upload_date)s|%(title)s",
      playlistUrl,
    ], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0 && !stdout.trim()) {
      console.error(`yt-dlp failed: ${stderr}`);
      return [];
    }

    const lines = stdout.split("\n").filter(Boolean).slice(0, limit);
    const items = [];

    for (const line of lines) {
      const parsed = parseYtDlpOutput(line);
      if (parsed) {
        if (playlistTitle) {
          parsed.playlist = playlistTitle;
          const yearMatch = playlistTitle.match(/(20\d{2})/);
          if (yearMatch) parsed.year = parseInt(yearMatch[1]);
          const confLower = playlistTitle.toLowerCase();
          for (const [key, name] of Object.entries(PLAYLIST_CONFERENCE_MAP)) {
            if (confLower.includes(key)) {
              parsed.conference = name;
              break;
            }
          }
        }
        items.push(parsed);
      }
    }

    return items;
  } catch (e) {
    console.error(`yt-dlp error: ${e.message}`);
    return [];
  }
}

/**
 * Fetch all videos from a playlist.
 * @param {Object} [options]
 * @param {string} [options.playlistId] - Playlist ID or URL
 * @param {number} [options.limit=50] - Max videos
 * @returns {Promise<Array<Object>>}
 */
export async function fetchAll(options = {}) {
  const playlistId = options.playlistId;
  
  if (!playlistId) {
    console.warn("YouTube connector: no playlistId specified");
    return [];
  }

  return fetchPlaylist(playlistId, { limit: options.limit || 50 });
}

export default {
  extractPlaylistId,
  buildVideoUrl,
  parseYtDlpOutput,
  fetchPlaylist,
  fetchAll,
};
