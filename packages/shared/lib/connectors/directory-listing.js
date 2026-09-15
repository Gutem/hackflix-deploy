/**
 * Shared utilities for directory-listing-based connectors (DEF CON, InfoCon).
 * @module packages/shared/lib/connectors/directory-listing
 */

/**
 * Fetch a URL, falling back to curl if Bun's fetch fails with ECONNRESET.
 * Uses spawn (streaming) to avoid execSync buffer limits on large directories.
 * @param {string} url - Full URL to fetch
 * @returns {Promise<string>} HTML content
 */
export async function fetchWithCurlFallback(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if (e.code === "ECONNRESET" || e.message?.includes("socket")) {
      const { spawn } = await import("child_process");
      const chunks = [];
      const cp = spawn("curl", ["-sL", url], { stdio: ["ignore", "pipe", "pipe"] });

      const timeout = setTimeout(() => { cp.kill(); }, 30000);

      cp.stdout.on("data", chunk => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        cp.on("close", code => {
          clearTimeout(timeout);
          code === 0 ? resolve() : reject(new Error(`curl exited ${code}`));
        });
        cp.on("error", err => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const html = Buffer.concat(chunks).toString("utf-8");
      if (!html) throw new Error(`Empty response from curl for ${url}`);
      return html;
    }
    throw e;
  }
}

/**
 * Parse HTML directory listing into structured entries.
 * @param {string} html - HTML content from directory listing
 * @returns {Array<{name: string, href: string}>}
 */
export function parseDirectoryListing(html) {
  const links = html.match(/href="([^"]+)"/g) || [];

  return links
    .map(link => {
      const match = link.match(/href="([^"]+)"/);
      return match ? { href: match[1], name: decodeURIComponent(match[1]) } : null;
    })
    .filter(item => item && !item.href.startsWith("?") && !item.href.startsWith("/"));
}

/**
 * Fetch and parse a directory listing from a URL.
 * @param {string} baseUrl - Base URL for the directory server
 * @param {string} path - Path to fetch
 * @returns {Promise<Array<{name: string, href: string}>>}
 */
export async function fetchDirectory(baseUrl, path) {
  const html = await fetchWithCurlFallback(`${baseUrl}${path}`);
  return parseDirectoryListing(html);
}

/**
 * Check for caption files matching a video in a captions directory.
 * @param {string} baseUrl - Base URL for constructing full caption URLs
 * @param {string} videoName - Video filename (e.g., "Talk Title.mp4")
 * @param {string} captionsPath - Path to captions directory
 * @param {string[]} [videoExtensions=[".mp4"]] - Video extensions to strip from filename
 * @returns {Promise<{ srt: string|null, vtt: string|null, json: string|null, txt: string|null, count: number }>}
 */
export async function checkCaptions(baseUrl, videoName, captionsPath, videoExtensions = [".mp4"]) {
  const captions = { srt: null, vtt: null, json: null, txt: null, count: 0 };

  try {
    const files = await fetchDirectory(baseUrl, captionsPath);
    const extPattern = new RegExp(`\\.(?:${videoExtensions.map(e => e.slice(1)).join("|")})$`, "i");
    const baseName = videoName.replace(extPattern, "");

    for (const file of files) {
      if (file.name.startsWith(baseName)) {
        const fullUrl = `${baseUrl}${captionsPath}${file.href}`;
        if (file.name.endsWith(".vtt")) { captions.vtt = fullUrl; captions.count++; }
        else if (file.name.endsWith(".srt")) { captions.srt = fullUrl; captions.count++; }
        else if (file.name.endsWith(".json")) { captions.json = fullUrl; captions.count++; }
        else if (file.name.endsWith(".txt")) { captions.txt = fullUrl; captions.count++; }
      }
    }
  } catch (e) {
    // Captions directory may not exist
  }

  return captions;
}
