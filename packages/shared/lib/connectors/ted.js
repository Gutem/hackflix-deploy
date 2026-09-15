/**
 * TED / TEDx Connector - fetches talks from ted.com
 * Uses TED's oEmbed API for metadata + page scraping for video URLs.
 * @module packages/shared/lib/connectors/ted
 */

import { buildContentItem, generateContentId } from "./content-item.js";

/** TED oEmbed endpoint */
const OEMBED_URL = "https://www.ted.com/services/v1/oembed";

/**
 * Fetch talk metadata via TED oEmbed API.
 * @param {string} talkUrl - Full TED talk URL
 * @returns {Promise<{title: string, thumbnail: string, description: string}|null>}
 */
async function fetchTalkMeta(talkUrl) {
  const apiUrl = `${OEMBED_URL}?url=${encodeURIComponent(talkUrl)}`;
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || "",
      thumbnail: data.thumbnail_url || "",
      description: (data.description || "").replace(/<[^>]+>/g, ""),
    };
  } catch {
    return null;
  }
}

/**
 * Extract video URL from TED talk page HTML.
 * TED embeds video in a <script> JSON-LD block or meta tag.
 * @param {string} talkUrl
 * @returns {Promise<string|null>}
 */
async function extractVideoUrl(talkUrl) {
  try {
    const res = await fetch(talkUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try JSON-LD first
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.video?.contentUrl) return data.video.contentUrl;
    }

    // Try meta/video tag
    const mp4Match = html.match(/https:\/\/[^"'\s]+\.mp4[^"'\s]*/i);
    if (mp4Match) return mp4Match[0];

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple TED talks by URL list.
 * @param {string[]} talkUrls - Array of TED/TEDx talk URLs
 * @param {Object} [options]
 * @param {string} [options.event] - Event name for conference field
 * @param {number} [options.year] - Year for metadata
 * @returns {Promise<Array<Object>>}
 */
export async function fetchTalks(talkUrls, options = {}) {
  const results = [];
  const event = options.event || "TED";
  const year = options.year || new Date().getFullYear();

  for (const url of talkUrls) {
    try {
      const meta = await fetchTalkMeta(url);
      if (!meta) continue;

      const videoUrl = await extractVideoUrl(url);
      const sourceId = `ted-${event.replace(/\s+/g, "-").toLowerCase()}`;

      results.push(buildContentItem(
        {
          id: generateContentId(sourceId, url),
          title: meta.title,
          source: "ted",
          videoUrl: videoUrl || url,
        },
        {
          description: meta.description,
          thumbnail: meta.thumbnail,
          year,
          speakers: [meta.title.split("|")[0]?.trim() || ""].filter(Boolean),
          tags: ["TED", event],
          conference: event,
          languages: ["eng"],
          frontendUrl: url,
        }
      ));
    } catch {
      // Skip failed talks
    }
  }

  return results;
}

/**
 * Discover TEDx talks from a TEDx event page.
 * @param {string} eventUrl - TEDx event page URL
 * @returns {Promise<string[]>} List of talk URLs
 */
export async function discoverEventTalks(eventUrl) {
  try {
    const res = await fetch(eventUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const links = html.match(/https:\/\/www\.ted\.com\/talks\/[^"'\s]+/g) || [];
    return [...new Set(links)];
  } catch {
    return [];
  }
}

export default { fetchTalks, discoverEventTalks, extractVideoUrl, fetchTalkMeta };
