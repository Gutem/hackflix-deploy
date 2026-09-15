/**
 * Shared content item builder for connectors.
 * Normalizes the output shape across all data sources.
 * @module packages/shared/lib/connectors/content-item
 */

/**
 * Build a normalized content item with defaults.
 * All connectors should use this to ensure consistent item shape.
 * @param {Object} params
 * @param {string} params.id - Unique content ID (include source prefix)
 * @param {string} params.title - Content title
 * @param {string} params.source - Source identifier (e.g. "infocon", "defcon", "media.ccc.de", "peertube", "youtube")
 * @param {string} params.videoUrl - Primary video URL
 * @param {Object} [overrides] - Additional/overriding fields
 * @returns {Object} Normalized content item
 */
export function buildContentItem({ id, title, source, videoUrl }, overrides = {}) {
  return {
    id,
    title,
    description: "",
    thumbnail: "",
    poster: "",
    duration: 0,
    year: new Date().getFullYear(),
    speakers: [],
    tags: [],
    viewCount: 0,
    languages: [],
    subtitles: 0,
    conference: "",
    source,
    videoUrl,
    frontendUrl: videoUrl,
    ...overrides,
  };
}

/**
 * Generate a base64-slice content ID from a seed string.
 * @param {string} source - Source prefix (e.g. "infocon", "defcon")
 * @param {string} seed - String to hash for the ID (filename, title, etc.)
 * @param {number} [length=24] - Number of base64 characters
 * @returns {string} Content ID like "infocon-QWxleCBQbGFza2V0dCAmIE1j"
 */
export function generateContentId(source, seed, length = 24) {
  const idBase = Buffer.from(seed).toString("base64").slice(0, length);
  return `${source}-${idBase}`;
}
