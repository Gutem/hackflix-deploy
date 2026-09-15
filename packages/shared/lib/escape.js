/**
 * HTML/XML escaping utilities.
 * Single source of truth for all escaping across the app.
 * @module packages/shared/lib/escape
 */

/**
 * Escape HTML special characters for safe innerHTML usage.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escape text for safe use in HTML attribute values.
 * Also escapes backtick for template literal safety.
 * @param {string} text
 * @returns {string}
 */
export function escapeAttr(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#96;");
}

/**
 * Escape text for safe use in XML contexts (slightly different from HTML).
 * @param {string} text
 * @returns {string}
 */
export function escapeXml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
