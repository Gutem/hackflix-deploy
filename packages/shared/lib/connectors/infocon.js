/**
 * InfoCon Conference Connector - fetches videos from infocon.org/cons archive.
 * Does NOT handle DEF CON (use defcon.js connector for media.defcon.org).
 * @module packages/shared/lib/connectors/infocon
 */

import { fetchDirectory as fetchDir, fetchWithCurlFallback, checkCaptions as checkCaps } from "./directory-listing.js";
import { buildContentItem, generateContentId } from "./content-item.js";

const INFOCON_BASE = "https://infocon.org/cons";

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp|gif|svg)$/i;

/**
 * Fetch directory listing from infocon.org.
 * @param {string} path - Path relative to /cons (e.g., "/44CON/")
 * @returns {Promise<Array<{name: string, href: string}>>}
 */
export async function fetchDirectory(path) {
  return fetchDir(INFOCON_BASE, path);
}

/**
 * Parse "Speaker - Title" filename pattern.
 * Pattern: "Speaker Name - Talk Title.mp4"
 * Also handles: "Speaker1 & Speaker2 - Title.mp4"
 *
 * When no " - " separator, uses heuristics:
 *   - >3 words OR contains common title words ("the", "using", etc.) → talk title, no speaker
 *   - otherwise → likely a person name, used as both title and speaker
 * @param {string} filename - Video filename
 * @param {string} conferenceName - Conference name to assign
 * @param {number} [year] - Year to assign
 * @returns {{ title: string, speakers: string[], conference: string, year: number }}
 */
export function parseSpeakerTitleFilename(filename, conferenceName, year) {
  const cleanName = filename.replace(/\.(mp4|webm)$/i, "");
  const parts = cleanName.split(" - ");

  let title = "";
  let speakers = [];

  if (parts.length >= 2) {
    const speakerPart = parts[0];
    title = parts.slice(1).join(" - ");
    speakers = speakerPart
      .split(/[&,]/)
      .map(s => s.trim())
      .filter(Boolean);
  } else if (looksLikeTitle(cleanName)) {
    title = cleanName;
    speakers = [];
  } else {
    title = cleanName;
    speakers = [cleanName];
  }

  return {
    title,
    speakers,
    conference: conferenceName,
    year: year || new Date().getFullYear()
  };
}

/**
 * Heuristic: does the filename look like a talk title rather than a speaker name?
 * @param {string} name
 * @returns {boolean}
 */
function looksLikeTitle(name) {
  const words = name.split(/\s+/);
  if (words.length > 3) return true;
  return /\b(the|a|an|to|of|in|with|using|for|and|or|on|at|from|by|is|are|into|how|why|what|your|its|not|no|vs|all|new|best)\b/i.test(name);
}

/**
 * Check if captions exist for a video.
 * @param {string} videoName - Video filename
 * @param {string} captionsPath - Path to captions directory
 * @returns {Promise<{ srt: string|null, vtt: string|null, json: string|null, txt: string|null, count: number }>}
 */
export async function checkCaptions(videoName, captionsPath) {
  return checkCaps(INFOCON_BASE, videoName, captionsPath, [".mp4", ".webm"]);
}

/**
 * Find a logo file in a directory listing.
 * Prefers: logo.webp > logo.png > logo.jpg > logo.gif > any image with "logo" in name
 * @param {Array<{name: string, href: string}>} entries
 * @returns {string|null} Relative href of the logo, or null
 */
export function findLogo(entries) {
  const priorities = ["logo.webp", "logo.png", "logo.jpg", "logo.jpeg", "logo.gif", "logo.svg"];
  const imageFiles = entries.filter(e => IMAGE_EXTENSIONS.test(e.name) && !e.href.startsWith("/fancyindex"));

  for (const prio of priorities) {
    const found = imageFiles.find(e => e.name.toLowerCase() === prio);
    if (found) return found.href;
  }

  const logoByName = imageFiles.find(e => e.name.toLowerCase().includes("logo"));
  if (logoByName) return logoByName.href;

  const firstImage = imageFiles.find(e => !e.name.toLowerCase().includes("favicon"));
  return firstImage ? firstImage.href : null;
}

/**
 * Parse "thank you" .txt file from infocon.org to extract conference description.
 * Format:
 *   Convention Name: FooCon
 *   Last Updated: YYYY-MM-DD
 *   <blank line>
 *   <description paragraph(s)>
 *   <blank line>
 *   Official Web Site:
 *   ...
 * @param {string} text - Raw text content
 * @returns {{ description: string|null }}
 */
export function parseThankYouTxt(text) {
  if (!text || text.includes("Error 404") || text.startsWith("<!DOCTYPE")) {
    return { description: null };
  }

  const lines = text.split("\n");
  const descLines = [];
  let started = false;
  let stopped = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("Convention Name:") || trimmed.startsWith("Last Updated:")) {
      continue;
    }

    if (!started && trimmed === "") {
      started = true;
      continue;
    }

    if (!started) continue;

    if (stopped) break;

    if (/^(Official Web Site|Social Media|Official Media Site|ERRORS|GET INVOLOLVED|mailto:)/i.test(trimmed)) {
      stopped = true;
      break;
    }

    if (trimmed === "") {
      if (descLines.length > 0) {
        stopped = true;
        break;
      }
      continue;
    }

    descLines.push(trimmed);
  }

  if (descLines.length === 0) {
    return { description: null };
  }

  let description = descLines.join(" ");
  description = description.replace(/\s+/g, " ").trim();

  return { description };
}

/**
 * Parse HEADER.md HTML from infocon.org to extract conference description and image.
 * The HTML format is:
 *   <div id="header-md">
 *     <div class="left"><img src="./image.png" ...></div>
 *     <div class="right"><h2>Name</h2><p>Description</p></div>
 *   </div>
 * Returns null for both if the page is a 404 or doesn't match the expected format.
 * @param {string} html - Raw HTML from HEADER.md endpoint
 * @returns {{ description: string|null, image: string|null }}
 */
export function parseHeaderMd(html) {
  if (!html || html.includes("Error 404") || !html.includes("header-md")) {
    return { description: null, image: null };
  }

  let image = null;
  const imgMatch = html.match(/<img[^>]+src="\.\/([^"]+)"/);
  if (imgMatch) {
    image = imgMatch[1];
  }

  let description = null;
  const pMatch = html.match(/<div class="right">[\s\S]*?<p>([\s\S]*?)<\/p>/);
  if (pMatch) {
    description = pMatch[1]
      .replace(/<a[^>]*>([\s\S]*?)<\/a>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return { description, image };
}

/**
 * Fetch a specific conference edition (e.g. "44CON 2024").
 * Handles various directory structures: videos directly in edition dir,
 * or inside a "video and slides" subdirectory, with optional captions.
 * @param {string} editionPath - Edition path relative to /cons (e.g., "/44CON/44CON%202024/")
 * @param {string} conferenceName - Display name (e.g., "44CON 2024")
 * @param {number} [year] - Year of the edition
 * @param {number} [limit=50] - Maximum videos to fetch
 * @returns {Promise<Array>}
 */
export async function fetchConferenceEdition(editionPath, conferenceName, year, limit = 50) {
  try {
    const entries = await fetchDirectory(editionPath);

    const captionsDir = entries.find(d => d.name.toLowerCase().includes("captions"));
    const videoSubDir = entries.find(d =>
      d.name.toLowerCase().includes("video") && !d.name.toLowerCase().includes("captions")
    );

    let videoFiles;
    let videoBasePath;

    if (videoSubDir) {
      const subEntries = await fetchDirectory(`${editionPath}${videoSubDir.href}`);
      videoFiles = subEntries.filter(v => /\.(mp4|webm)$/i.test(v.name));
      videoBasePath = `${editionPath}${videoSubDir.href}`;
    } else {
      videoFiles = entries.filter(v => /\.(mp4|webm)$/i.test(v.name));
      videoBasePath = editionPath;
    }

    videoFiles = videoFiles.slice(0, limit);

    let captionsFiles = null;
    if (captionsDir) {
      try {
        captionsFiles = await fetchDirectory(`${editionPath}${captionsDir.href}`);
      } catch {
        captionsFiles = null;
      }
    }

    const results = [];
    for (const video of videoFiles) {
      const parsed = parseSpeakerTitleFilename(video.name, conferenceName, year);
      let captions = { srt: null, vtt: null, json: null, txt: null, count: 0 };
      if (captionsFiles) {
        const extPattern = /\.(mp4|webm)$/i;
        const baseName = video.name.replace(extPattern, "");
        for (const f of captionsFiles) {
          if (f.name.startsWith(baseName)) {
            const fullUrl = `${INFOCON_BASE}${editionPath}${captionsDir.href}${f.href}`;
            if (f.name.endsWith(".vtt")) { captions.vtt = fullUrl; captions.count++; }
            else if (f.name.endsWith(".srt")) { captions.srt = fullUrl; captions.count++; }
            else if (f.name.endsWith(".json")) { captions.json = fullUrl; captions.count++; }
            else if (f.name.endsWith(".txt")) { captions.txt = fullUrl; captions.count++; }
          }
        }
      }

      results.push(buildInfoconContentItem({
        parsed,
        sourceId: `${conferenceName.replace(/\s+/g, "-").toLowerCase()}`,
        videoUrl: `${INFOCON_BASE}${videoBasePath}${video.href}`,
        tags: [conferenceName],
        subtitles: captions.count,
        captions: captions.vtt || captions.srt || captions.json,
        filename: video.name,
        editionUrl: `${INFOCON_BASE}${editionPath}`,
      }));
    }

    return results;
  } catch (e) {
    console.error(`Failed to fetch ${editionPath}:`, e.message);
    return [];
  }
}

/**
 * Fetch videos from a generic conference path (auto-discovers year dirs).
 * @param {string} confPath - Conference path (e.g., "/Black%20Hat/")
 * @param {number} [limit=30] - Maximum videos to fetch
 * @returns {Promise<Array>}
 */
export async function fetchConference(confPath, limit = 30) {
  try {
    const years = await fetchDirectory(confPath);
    const results = [];

    for (const yearDir of years.slice(0, 3)) {
      if (!yearDir.name.endsWith("/")) continue;

      const subDirs = await fetchDirectory(`${confPath}${yearDir.href}`);
      const videoDir = subDirs.find(d =>
        d.name.toLowerCase().includes("video") && !d.name.toLowerCase().includes("captions")
      );
      if (!videoDir) continue;

      const videos = await fetchDirectory(`${confPath}${yearDir.href}${videoDir.href}`);
      const videoFiles = videos
        .filter(v => /\.(mp4|webm)$/i.test(v.name))
        .slice(0, Math.ceil(limit / 3));

      const yearMatch = yearDir.name.match(/(20\d{2})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      const confName = yearDir.name.replace(/\/$/, "");

      for (const video of videoFiles) {
        const parsed = parseSpeakerTitleFilename(video.name, confName, year);

        results.push(buildInfoconContentItem({
          parsed,
          sourceId: `${confName.replace(/\s+/g, "-").toLowerCase()}`,
          videoUrl: `${INFOCON_BASE}${confPath}${yearDir.href}${videoDir.href}${video.href}`,
          tags: [confName],
          subtitles: 0,
          filename: video.name,
          editionUrl: `${INFOCON_BASE}${confPath}${yearDir.href}`,
        }));

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }

    return results;
  } catch (e) {
    console.error(`Failed to fetch ${confPath}:`, e.message);
    return [];
  }
}

/**
 * Fetch all available videos across all infocon conferences (excl. CCC/DEF CON).
 * @param {Object} options
 * @param {number} [options.limit=100] - Maximum videos to fetch
 * @returns {Promise<Array>}
 */
export async function fetchAll({ limit = 100 } = {}) {
  const confs = await listConferences();

  const results = [];
  const BATCH = 5;

  for (let i = 0; i < confs.length; i += BATCH) {
    if (results.length >= limit) break;
    const batch = confs.slice(i, i + BATCH);

    const withEditions = await Promise.all(
      batch.map(async (conf) => {
        try {
          const editions = await fetchConferenceEditions(`/${conf.path}`);
          const recent = editions
            .filter(e => e.year)
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, 3);
          return { conf, editions: recent };
        } catch {
          return { conf, editions: [] };
        }
      })
    );

    for (const { conf, editions } of withEditions) {
      for (const ed of editions) {
        if (results.length >= limit) break;
        try {
          const remaining = Math.min(10, limit - results.length);
          const name = `${conf.name} ${ed.year || ed.name}`;
          const videos = await fetchConferenceEdition(ed.path, name, ed.year, remaining);
          results.push(...videos);
        } catch {
          // Skip failed editions
        }
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * List all infocon.org conferences (excl. CCC/DEF CON/archive).
 * Single source of truth — used by connectors.js, supervised.js, and fetchAll.
 * @returns {Promise<Array<{name: string, path: string, slug: string}>>}
 */
export async function listConferences() {
  const entries = await fetchDirectory("/");
  const excluded = [/Chaos Computer/i, /^CCC$/i, /DEF CON/i, /archive/i];

  return entries
    .filter(e => e.name.endsWith("/") && !e.href.startsWith("http"))
    .map(e => {
      const name = e.name.replace(/\/$/, "").trim();
      return { name, path: e.href, slug: name.toLowerCase().replace(/\s+/g, "-") };
    })
    .filter(c => c.name.length > 0 && c.name !== ".." && !excluded.some(r => r.test(c.name)));
}

/**
 * Fetch list of all conferences available on infocon.org with descriptions and images.
 * Fetches directory listing per conference for logo (findLogo) and thank-you.txt for description.
 * @returns {Promise<Array<{ name: string, slug: string, path: string, description: string|null, image: string|null }>>}
 */
export async function fetchConferenceList() {
  const entries = await fetchDirectory("/");

  const conferences = entries
    .filter(e => e.name.endsWith("/") && !e.href.startsWith("/") && !e.href.startsWith("http"))
    .map(e => {
      const name = e.name.replace(/\/$/, "");
      return {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        path: e.href,
        description: null,
        image: null,
      };
    })
    .filter(c => !c.name.includes("archive") && c.name.length > 0 && c.name !== "..");

  const batchSize = 10;
  for (let i = 0; i < conferences.length; i += batchSize) {
    const batch = conferences.slice(i, i + batchSize);
    const promises = batch.map(async (conf) => {
      try {
        const dirEntries = await fetchDirectory(`/${conf.path}`);

        const logoHref = findLogo(dirEntries);
        if (logoHref) {
          const encoded = logoHref.split("/").map(p => encodeURIComponent(decodeURIComponent(p))).join("/");
          conf.image = `https://infocon.org/cons/${conf.path}${encoded}`;
        }

        const txtFile = dirEntries.find(e => e.name.endsWith(".txt") && e.name.toLowerCase().includes("thank"));
        if (txtFile) {
          try {
            const txtUrl = `https://infocon.org/cons/${conf.path}${txtFile.href}`;
            const txtContent = await fetchWithCurlFallback(txtUrl);
            const parsed = parseThankYouTxt(txtContent);
            if (parsed.description) conf.description = parsed.description;
          } catch {
            // txt fetch failed
          }
        }
      } catch {
        // Directory not readable
      }
    });
    await Promise.all(promises);
  }

  return conferences;
}

/**
 * Fetch available editions (years) for a conference.
 * @param {string} conferencePath - Conference path (e.g., "/44CON/")
 * @returns {Promise<Array<{ name: string, path: string, year: number|null }>>}
 */
export async function fetchConferenceEditions(conferencePath) {
  const entries = await fetchDirectory(conferencePath);

  return entries
    .filter(e => e.name.endsWith("/"))
    .map(e => {
      const name = e.name.replace(/\/$/, "");
      const yearMatch = name.match(/(20\d{2})/);
      return {
        name,
        path: `${conferencePath}${e.href}`,
        year: yearMatch ? parseInt(yearMatch[1]) : null,
      };
    })
    .filter(e => !e.name.toLowerCase().includes("archive"));
}

/**
 * Build a standardized content item.
 * @param {Object} params
 * @param {{ title: string, speakers: string[], conference: string, year: number }} params.parsed
 * @param {string} params.sourceId
 * @param {string} params.videoUrl
 * @param {string[]} params.tags
 * @param {number} params.subtitles
 * @param {string} [params.captions]
 * @returns {Object}
 */
function buildInfoconContentItem({ parsed, sourceId, videoUrl, tags, subtitles, captions, filename, editionUrl }) {
  return buildContentItem(
    {
      id: generateContentId(sourceId, filename || parsed.title),
      title: parsed.title,
      source: "infocon",
      videoUrl,
    },
    {
      year: parsed.year,
      speakers: parsed.speakers,
      tags,
      languages: ["eng"],
      subtitles,
      conference: parsed.conference,
      frontendUrl: editionUrl || videoUrl,
      captions: captions || null,
    }
  );
}

export default {
  fetchDirectory,
  parseSpeakerTitleFilename,
  checkCaptions,
  findLogo,
  fetchConferenceEdition,
  fetchConference,
  fetchConferenceList,
  fetchConferenceEditions,
  fetchAll,
};
