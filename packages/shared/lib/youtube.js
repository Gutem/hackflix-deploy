/**
 * YouTube utilities for embedding videos and extracting metadata.
 * @module packages/shared/lib/youtube
 */

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} input - YouTube URL or video ID
 * @returns {string|null} Video ID or null
 */
export function extractVideoId(input) {
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  if (/^https?:\/\//i.test(input)) {
    return null;
  }

  return input;
}

/**
 * Generate YouTube embed URL
 * @param {string} videoId - YouTube video ID
 * @param {Object} options - Embed options
 * @param {boolean} options.autoplay - Enable autoplay
 * @param {number} options.start - Start time in seconds
 * @param {boolean} options.controls - Show player controls
 * @returns {string} Embed URL
 */
export function getEmbedUrl(videoId, options = {}) {
  if (!videoId) return "";

  const params = new URLSearchParams();
  
  if (options.autoplay) {
    params.set("autoplay", "1");
  }
  if (options.start && options.start > 0) {
    params.set("start", String(options.start));
  }
  if (options.controls === false) {
    params.set("controls", "0");
  }

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ""}`;
}

/**
 * Generate YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality (default, hq, mq, sd, maxres)
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(videoId, quality = "default") {
  if (!videoId) return "";

  const qualityMap = {
    default: "default",
    hq: "hqdefault",
    mq: "mqdefault",
    sd: "sddefault",
    maxres: "maxresdefault",
  };

  const qualityPath = qualityMap[quality] || "default";
  return `https://img.youtube.com/vi/${videoId}/${qualityPath}.jpg`;
}

/**
 * Check if a URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} True if YouTube URL
 */
export function isYouTubeUrl(url) {
  if (!url) return false;

  const youtubePattern = /(?:youtube\.com|youtu\.be)/i;
  return youtubePattern.test(url);
}

/**
 * Parse duration string to minutes
 * @param {string|number} duration - Duration in ISO 8601 format or minutes
 * @returns {number} Duration in minutes
 */
export function parseDuration(duration) {
  if (typeof duration === "number") {
    return duration;
  }

  if (typeof duration === "string") {
    const numeric = parseInt(duration, 10);
    if (!isNaN(numeric) && String(numeric) === duration.trim()) {
      return numeric;
    }

    const isoMatch = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1] || "0", 10);
      const minutes = parseInt(isoMatch[2] || "0", 10);
      return hours * 60 + minutes;
    }
  }

  return 0;
}

/**
 * Format duration from minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "0m";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

export default {
  extractVideoId,
  getEmbedUrl,
  getThumbnailUrl,
  isYouTubeUrl,
  parseDuration,
  formatDuration,
};
