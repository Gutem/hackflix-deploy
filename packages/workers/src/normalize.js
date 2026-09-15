/**
 * Content normalization - ensures consistent schema across all sources.
 * @module packages/workers/src/normalize
 */

import { PLAYLIST_CONFERENCE_MAP } from "../../shared/lib/connectors/youtube.js";

/**
 * Standard content schema fields.
 * All connectors should normalize to this schema.
 */
const STANDARD_FIELDS = [
  "id",
  "title",
  "description",
  "thumbnail",
  "poster",
  "duration",
  "year",
  "speakers",
  "tags",
  "viewCount",
  "languages",
  "subtitles",
  "subtitlesByLanguage",
  "conference",
  "source",
  "videoUrl",
  "videosByLanguage",
  "frontendUrl",
  "updatedAt",
  "playlist",
  "channel",
];

/**
 * Source name aliases for normalization.
 */
const SOURCE_ALIASES = {
  "media.ccc.de": "ccc",
  ccc: "ccc",
  peertube: "peertube",
  infocon: "infocon",
  defcon: "defcon",
  youtube: "youtube",
  ted: "ted",
};

/**
 * Normalize a single content item to standard schema.
 * @param {Object} item - Raw content from any source
 * @returns {Object} Normalized content
 */
export function normalizeContent(item) {
  const subtitlesObj = typeof item.subtitles === "object" && item.subtitles !== null 
    ? item.subtitles 
    : null;

  const subtitlesFromCaptions = item.captions
    ? captionsToSubtitlesByLanguage(item.captions, item.languages)
    : null;

  const finalSubtitlesByLanguage = item.subtitlesByLanguage || subtitlesObj || subtitlesFromCaptions || null;

  const source = normalizeSource(item.source);
  const conference = normalizeConference(item.conference, item, source);
  const title = (item.title || "").trim();
  const description = stripHtml((item.description || "").trim());
  const speakers = normalizeArray(item.speakers || item.persons || []).map(s => s.trim()).filter(Boolean);
  const tags = [...new Set(normalizeArray(item.tags || []).map(t => t.trim()).filter(Boolean))];

  const normalized = {
    id: item.id || "",
    title,
    description,
    thumbnail: item.thumbnail || item.thumb_url || "",
    poster: item.poster || item.poster_url || "",
    duration: normalizeDuration(item.duration, item.length),
    year: item.year || extractYearFromTitle(item.title) || (item.date ? new Date(item.date).getFullYear() : new Date().getFullYear()),
    speakers,
    tags,
    viewCount: item.viewCount || item.view_count || 0,
    languages: normalizeLanguages(item.languages || item.original_language),
    subtitles: normalizeSubtitles(item.subtitles),
    subtitlesByLanguage: finalSubtitlesByLanguage,
    conference,
    source,
    videoUrl: item.videoUrl || item.recording_url || null,
    videosByLanguage: item.videosByLanguage || null,
    frontendUrl: item.frontendUrl || item.frontend_link || item.url || "",
    updatedAt: item.updatedAt || new Date().toISOString(),
    playlist: item.playlist || null,
    channel: item.channel || null,
  };

  const extra = extractExtraFields(item, normalized);
  if (Object.keys(extra).length > 0) {
    normalized.extra = extra;
  }

  return normalized;
}

/**
 * Convert a captions URL to subtitlesByLanguage object.
 * Extracts language code from filename pattern like "talk.eng.vtt" or "talk.eng.srt".
 * @param {string} captionsUrl - URL to caption file
 * @param {string|string[]} [languages] - Language codes from the content item
 * @returns {Object|null} subtitlesByLanguage map or null
 */
function captionsToSubtitlesByLanguage(captionsUrl, languages) {
  if (!captionsUrl || typeof captionsUrl !== "string") return null;

  const langFromFilename = captionsUrl.match(/[._]([a-z]{3})\.(vtt|srt|json|txt)$/i);
  const lang = langFromFilename ? langFromFilename[1].toLowerCase() : null;

  if (lang) {
    return { [lang]: captionsUrl };
  }

  const fallbackLang = Array.isArray(languages) ? languages[0] : languages;
  if (fallbackLang && typeof fallbackLang === "string") {
    return { [fallbackLang.toLowerCase()]: captionsUrl };
  }

  return null;
}

/**
 * Normalize an array field.
 * @param {any} value
 * @returns {Array}
 */
function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

/**
 * Normalize languages to an array of language codes.
 * @param {any} value
 * @returns {Array<string>}
 */
function normalizeLanguages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(/[-,]/).map((l) => l.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Normalize subtitles to a count.
 * @param {any} value
 * @returns {number}
 */
function normalizeSubtitles(value) {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length;
  }
  return 0;
}

/**
 * Normalize source name.
 * @param {string} source
 * @returns {string}
 */
function normalizeSource(source) {
  if (!source) return "unknown";
  const lower = source.toLowerCase();
  return SOURCE_ALIASES[lower] || lower;
}

/**
 * Extract non-standard fields into extra object.
 * @param {Object} item
 * @param {Object} normalized
 * @returns {Object}
 */
function extractExtraFields(item, normalized) {
  const extra = {};
  const standardFields = new Set(STANDARD_FIELDS);

  for (const [key, value] of Object.entries(item)) {
    if (!standardFields.has(key) && value !== undefined && value !== null) {
      extra[key] = value;
    }
  }

  return extra;
}

/**
 * Normalize a batch of content items.
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
export function normalizeBatch(items) {
  return items.map(normalizeContent);
}

/**
 * Normalize duration to minutes.
 * Accepts seconds (length field) or minutes (duration field).
 * @param {number} duration - Value from duration field
 * @param {number} length - Value from length field (usually seconds)
 * @returns {number} Duration in minutes
 */
function normalizeDuration(duration, length) {
  if (duration && duration > 0) return duration;
  if (length && length > 0) {
    return length > 1000 ? Math.floor(length / 60) : length;
  }
  return 0;
}

/**
 * Detect real conference name from context (playlist name, channel, etc).
 * @param {string} conference - Raw conference value
 * @param {Object} item - Full item for context clues
 * @param {string} source - Normalized source name
 * @returns {string}
 */
function normalizeConference(conference, item, source) {
  const raw = (conference || item.conference_title || "").trim();

  if (raw && raw !== "YouTube" && raw !== "youtube") return raw;

  if (source === "youtube") {
    const channel = (item.channel || "").toLowerCase();
    const playlist = (item.playlist || "").toLowerCase();
    const text = `${playlist} ${channel}`;
    for (const [key, name] of Object.entries(PLAYLIST_CONFERENCE_MAP)) {
      if (text.includes(key)) return name;
    }
  }

  return raw || "";
}

/**
 * Strip HTML tags from text.
 * @param {string} text
 * @returns {string}
 */
function stripHtml(text) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Extract year from title text (e.g., "BSidesNYC 2023 - Talk" → 2023).
 * @param {string} title
 * @returns {number|null}
 */
export function extractYearFromTitle(title) {
  if (!title) return null;
  const match = title.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

export default {
  normalizeContent,
  normalizeBatch,
  STANDARD_FIELDS,
  SOURCE_ALIASES,
};
