/**
 * SVG placeholder generator for content with no thumbnail.
 * @module packages/shared/lib/placeholder
 */

import { escapeXml } from "./escape.js";

const COLORS = [
  { bg: "#1a1a2e", fg: "#e50914" },
  { bg: "#1a2e1a", fg: "#46d369" },
  { bg: "#2e1a1a", fg: "#e87c2c" },
  { bg: "#1a1a2e", fg: "#4a90d9" },
  { bg: "#2e1a2e", fg: "#c94ad9" },
];

/**
 * Generate an SVG placeholder data URL for content without a thumbnail.
 * @param {string} title
 * @param {number} [width=360]
 * @param {number} [height=203]
 * @returns {string} Data URL (data:image/svg+xml,...)
 */
export function generatePlaceholder(title, width = 360, height = 203) {
  const colorIdx = title ? title.length % COLORS.length : 0;
  const { bg, fg } = COLORS[colorIdx];
  const barHeight = Math.max(3, Math.round(height * 0.02));

  const initials = (title || "??")
    .split(/[\s\-_:]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => [...w][0]?.toUpperCase() || "")
    .join("");

  const fontSize = Math.round(Math.min(width, height) * 0.18);
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  const escaped = escapeXml(initials);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${bg}"/><rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="${fg}" opacity="0.8"/><text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="central">${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get a thumbnail URL — passthrough if thumbnail exists, otherwise generate placeholder.
 * @param {string|null} thumbnail - Original thumbnail URL
 * @param {string} title - Content title for placeholder
 * @returns {string} Thumbnail URL or placeholder data URL
 */
export function getThumbnailUrl(thumbnail, title) {
  if (thumbnail && thumbnail.trim()) return thumbnail;
  return generatePlaceholder(title);
}

/**
 * Legacy: same as generatePlaceholder.
 * @deprecated Use generatePlaceholder instead.
 * @param {string} title
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string}
 */
export function placeholder(title, width, height) {
  return generatePlaceholder(title, width, height);
}
