/**
 * DEF CON Media Connector - fetches videos from media.defcon.org.
 * @module packages/shared/lib/connectors/defcon
 */

import { fetchDirectory, checkCaptions } from "./directory-listing.js";
import { buildContentItem, generateContentId } from "./content-item.js";

const DEFCON_BASE = "https://media.defcon.org";

/**
 * Parse DEF CON video filename to extract metadata.
 * Pattern: "DEF CON 32 - Title - Speaker1, Speaker2.mp4"
 *
 * When only 2 parts: conf + title (no speaker).
 * When only 1 part: heuristic — title if >3 words or contains common title words, else speaker.
 * @param {string} filename - Video filename
 * @returns {{ title: string, speakers: string[], conference: string, year: number }}
 */
export function parseDefconFilename(filename) {
  const cleanName = filename.replace(/\.mp4$/i, "");
  const parts = cleanName.split(" - ");

  let title = "";
  let speakers = [];
  let conference = "";

  if (parts.length >= 3) {
    conference = parts[0];
    title = parts.slice(1, -1).join(" - ");
    const lastPart = parts[parts.length - 1];
    speakers = lastPart.includes(",")
      ? lastPart.split(",").map(s => s.trim())
      : [lastPart.trim()];
  } else if (parts.length === 2) {
    conference = parts[0];
    title = parts[1];
  } else {
    const name = cleanName;
    const words = name.split(/\s+/);
    const hasTitleWords = /\b(the|a|an|to|of|in|with|using|for|and|or|on|at|from|by|is|are|into|how|why|what)\b/i.test(name);
    if (words.length > 3 || hasTitleWords) {
      title = name;
      speakers = [];
    } else {
      title = name;
      speakers = [name];
    }
  }

  const confMatch = conference.match(/DEF CON (\d+)/i);
  const year = confMatch ? 1993 + parseInt(confMatch[1]) : new Date().getFullYear();

  return {
    title: title || cleanName,
    speakers,
    conference: conference || "DEF CON",
    year
  };
}

/**
 * Check if captions exist for a video.
 * Delegates to shared checkCaptions utility.
 * @param {string} videoName - Video filename
 * @param {string} captionsPath - Path to captions directory
 * @returns {Promise<{ srt: string|null, vtt: string|null, json: string|null, txt: string|null, count: number }>}
 */
export async function checkCaptionsLocal(videoName, captionsPath) {
  return checkCaptions(DEFCON_BASE, videoName, captionsPath, [".mp4"]);
}

/**
 * Fetch DEF CON videos from a specific year.
 * @param {number} year - DEF CON year number (e.g., 32)
 * @param {number} [limit=50] - Maximum videos to fetch
 * @returns {Promise<Array>}
 */
export async function fetchDefConYear(year, limit = 50) {
  const confPath = `/DEF%20CON%20${year}/`;

  try {
    const dirs = await fetchDirectory(DEFCON_BASE, confPath);

    const videoDir = dirs.find(d =>
      d.name.includes("video and slides") && !d.name.includes("captions")
    );

    if (!videoDir) {
      console.log(`No video directory found for DEF CON ${year}`);
      return [];
    }

    const captionsDir = dirs.find(d => d.name.includes("captions"));
    const logoFile = dirs.find(d =>
      /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(d.name) &&
      d.name.toLowerCase().includes("logo")
    );

    const videos = await fetchDirectory(DEFCON_BASE, `${confPath}${videoDir.href}`);

    const results = [];
    const videoFiles = videos
      .filter(v => v.name.endsWith(".mp4"))
      .slice(0, limit);

    let captionsFiles = null;
    if (captionsDir) {
      try {
        captionsFiles = await fetchDirectory(DEFCON_BASE, `${confPath}${captionsDir.href}`);
      } catch {
        captionsFiles = null;
        }
      }

    for (const video of videoFiles) {
      const parsed = parseDefconFilename(video.name);
      let captions = { srt: null, vtt: null, json: null, txt: null, count: 0 };
      if (captionsFiles) {
        const baseName = video.name.replace(/\.mp4$/i, "");
        for (const f of captionsFiles) {
          if (f.name.startsWith(baseName)) {
            const fullUrl = `${DEFCON_BASE}${confPath}${captionsDir.href}${f.href}`;
            if (f.name.endsWith(".vtt")) { captions.vtt = fullUrl; captions.count++; }
            else if (f.name.endsWith(".srt")) { captions.srt = fullUrl; captions.count++; }
            else if (f.name.endsWith(".json")) { captions.json = fullUrl; captions.count++; }
            else if (f.name.endsWith(".txt")) { captions.txt = fullUrl; captions.count++; }
          }
        }
      }

      results.push(buildContentItem(
        {
          id: generateContentId("defcon", `${year}-${video.name}`),
          title: parsed.title,
          source: "defcon",
          videoUrl: `${DEFCON_BASE}${confPath}${videoDir.href}${video.href}`,
        },
        {
          year: parsed.year,
          speakers: parsed.speakers,
          tags: ["DEF CON", `DEF CON ${year}`],
          languages: ["eng"],
          subtitles: captions.count,
          conference: `DEF CON ${year}`,
          frontendUrl: `${DEFCON_BASE}${confPath}`,
          captions: captions.vtt || captions.srt || captions.json,
        }
      ));
    }

    return results;
  } catch (e) {
    console.error(`Failed to fetch DEF CON ${year}:`, e.message);
    return [];
  }
}

/**
 * Fetch available DEF CON years from media.defcon.org.
 * @returns {Promise<Array<{ year: number, name: string, path: string }>>}
 */
export async function fetchAvailableYears() {
  const entries = await fetchDirectory(DEFCON_BASE, "/");

  return entries
    .filter(e => /^DEF CON \d+\/$/.test(e.name))
    .map(e => {
      const match = e.name.match(/DEF CON (\d+)/);
      const yearNum = match ? parseInt(match[1]) : 0;
      return {
        year: yearNum,
        name: e.name.replace(/\/$/, ""),
        path: e.href,
      };
    })
    .filter(e => e.year > 0)
    .sort((a, b) => b.year - a.year);
}

export default {
  fetchDirectory,
  parseDefconFilename,
  checkCaptions,
  fetchDefConYear,
  fetchAvailableYears,
};
