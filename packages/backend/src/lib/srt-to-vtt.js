/**
 * SRT to WebVTT subtitle converter.
 * @module packages/backend/src/lib/srt-to-vtt
 */

/**
 * Convert SRT subtitle content to WebVTT format.
 * Passes through content that already starts with WEBVTT header.
 * @param {string} srt - SRT or VTT subtitle content
 * @returns {string} WebVTT formatted content
 */
export function srtToVtt(srt) {
  if (!srt || !srt.trim()) return "";
  const trimmed = srt.trim();
  if (trimmed.startsWith("WEBVTT")) return trimmed;
  const lines = trimmed.split(/\r?\n/);
  const vttLines = ["WEBVTT", ""];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^\d+$/.test(line)) {
      i++;
      if (i >= lines.length) break;
      const timeLine = lines[i].trim().replace(/,/g, ".");
      vttLines.push(line);
      vttLines.push(timeLine);
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        vttLines.push(lines[i]);
        i++;
      }
      vttLines.push("");
    } else {
      i++;
    }
  }
  return vttLines.join("\n");
}
