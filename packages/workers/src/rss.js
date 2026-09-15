/**
 * RSS feed monitor for detecting new content automatically.
 * @module packages/workers/src/rss
 *
 * Supported feeds:
 *   - media.ccc.de RSS feeds (per conference)
 *   - PeerTube instance RSS
 *   - Any RSS/Atom feed with video enclosures
 */

/**
 * Parse RSS/Atom XML to extract video entries.
 * @param {string} xml - RSS or Atom XML
 * @returns {Array<Object>}
 */
export function parseRSS(xml) {
  const items = [];

  const itemMatches = xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi);
  for (const match of itemMatches) {
    const itemXml = match[0];

    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");
    const guid = extractTag(itemXml, "guid") || link;

    const enclosure = extractEnclosure(itemXml);

    items.push({
      id: guid ? decodeEntities(guid) : `rss-${Buffer.from(title + link).toString("base64").slice(0, 16)}`,
      title: decodeEntities(title),
      description: decodeEntities(description),
      url: link,
      videoUrl: enclosure?.url || null,
      pubDate,
      enclosure,
    });
  }

  const entryMatches = xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi);
  for (const match of entryMatches) {
    const entryXml = match[0];

    const title = extractTag(entryXml, "title");
    const link = entryXml.match(/<link[^>]+href="([^"]+)"/)?.[1] || "";
    const summary = extractTag(entryXml, "summary") || extractTag(entryXml, "content");
    const published = extractTag(entryXml, "published") || extractTag(entryXml, "updated");
    const id = extractTag(entryXml, "id") || link;

    items.push({
      id: id || `rss-${Buffer.from(title + link).toString("base64").slice(0, 16)}`,
      title: decodeEntities(title),
      description: decodeEntities(summary),
      url: link,
      videoUrl: null,
      pubDate: published,
    });
  }

  return items;
}

/**
 * Extract text content of an XML tag.
 * @param {string} xml
 * @param {string} tag
 * @returns {string}
 */
function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

/**
 * Extract enclosure/media:content URL from item.
 * @param {string} itemXml
 * @returns {{ url: string, type: string, length: number }|null}
 */
function extractEnclosure(itemXml) {
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="([^"]+)"/);
  if (enclosureMatch) {
    return {
      url: enclosureMatch[1],
      type: enclosureMatch[2],
      length: 0,
    };
  }

  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"[^>]*>/);
  if (mediaMatch) {
    return {
      url: mediaMatch[1],
      type: "video/mp4",
      length: 0,
    };
  }

  return null;
}

/**
 * Decode HTML entities.
 * @param {string} str
 * @returns {string}
 */
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Known RSS feeds for content sources.
 */
export const RSS_FEEDS = {
  ccc: [
    "https://api.media.ccc.de/public/conferences/39c3/podcast/mp4.xml",
    "https://api.media.ccc.de/public/conferences/38c3/podcast/mp4.xml",
    "https://api.media.ccc.de/public/conferences/37c3/podcast/mp4.xml",
    "https://api.media.ccc.de/public/conferences/36c3/podcast/mp4.xml",
    "https://api.media.ccc.de/public/conferences/35c3/podcast/mp4.xml",
  ],
  peertube: [
    "https://peertube.lhc.net.br/feeds/videos.xml",
  ],
};

/**
 * Fetch and parse an RSS feed.
 * @param {string} url
 * @returns {Promise<Array<Object>>}
 */
export async function fetchRSSFeed(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  } catch (e) {
    console.error(`Failed to fetch RSS ${url}:`, e.message);
    return [];
  }
}

/**
 * Check feeds for new content since last check.
 * @param {Object} options
 * @param {Array<string>} [options.feeds] - Feed URLs
 * @param {Set<string>} options.knownIds - Already known content IDs
 * @returns {Promise<Array<Object>>} New items not in knownIds
 */
export async function checkForNewContent({ feeds, knownIds }) {
  const newItems = [];

  for (const url of feeds) {
    const items = await fetchRSSFeed(url);
    for (const item of items) {
      if (!knownIds.has(item.id)) {
        newItems.push(item);
      }
    }
  }

  return newItems;
}
