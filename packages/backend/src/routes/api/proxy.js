/**
 * Proxy API handlers — video, image, subtitle proxying.
 * @module packages/backend/src/routes/api/proxy
 */

import { json } from "../../lib/response.js";
import { srtToVtt } from "../../lib/srt-to-vtt.js";
import { spawn } from "child_process";

const ALLOWED_PROXY_DOMAINS = [
  "media.ccc.de", "cdn.media.ccc.de", "media.defcon.org",
  "infocon.org", "peertube.lhc.net.br", "makertube.net",
  "bolha.tube", "youtube.com", "youtu.be", "i.ytimg.com",
  "archive.org",
];

/** @param {string} urlStr @returns {{valid: boolean, error?: string}} */
export function validateProxyUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS URLs allowed" };
    }
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_PROXY_DOMAINS.some(d => host === d || host.endsWith("." + d))) {
      return { valid: false, error: `Domain not allowed: ${host}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL" };
  }
}

/**
 * Apply gzip compression to JSON responses if client accepts it.
 * @param {Response} response
 * @param {Request} req
 * @returns {Response}
 */
export async function maybeCompress(response, req) {
  if (response.status >= 300 || !response.body) return response;
  const ct = response.headers.get("Content-Type") || "";
  if (!ct.includes("application/json")) return response;

  const accept = req.headers.get("Accept-Encoding") || "";
  if (!accept.includes("gzip")) {
    response.headers.set("Cache-Control", "public, max-age=60");
    return response;
  }

  try {
    const text = await response.text();
    const compressed = Bun.gzipSync(new TextEncoder().encode(text));
    return new Response(compressed, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "Content-Encoding": "gzip",
        "Cache-Control": "public, max-age=60",
        "Vary": "Accept-Encoding",
      },
    });
  } catch {
    response.headers.set("Cache-Control", "public, max-age=60");
    return response;
  }
}

/** @param {Request} req @param {Object} user */
export async function handleGetSubtitles(req, user) {
  if (!user || (user.tier !== "premium" && user.tier !== "admin")) {
    return json({ error: "Subtitles require premium subscription" }, 403);
  }

  const url = new URL(req.url);
  const vttUrl = url.searchParams.get("url");
  if (!vttUrl) return json({ error: "Missing url parameter" }, 400);

  const validation = validateProxyUrl(vttUrl);
  if (!validation.valid) return json({ error: validation.error }, 400);

  try {
    const chunks = [];
    const curlProcess = spawn("curl", ["-sL", vttUrl]);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { curlProcess.kill(); reject(new Error("Timeout")); }, 15000);
      curlProcess.stdout.on("data", chunk => chunks.push(chunk));
      curlProcess.on("close", code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`curl ${code}`)); });
      curlProcess.on("error", err => { clearTimeout(timeout); reject(err); });
    });

    const content = Buffer.concat(chunks).toString("utf-8");
    return new Response(srtToVtt(content), {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/** @param {Request} req */
export async function handleProxyVideo(req) {
  const url = new URL(req.url);
  const videoUrl = url.searchParams.get("url");
  if (!videoUrl) return json({ error: "Missing url parameter" }, 400);

  const validation = validateProxyUrl(videoUrl);
  if (!validation.valid) return json({ error: validation.error }, 400);

  try {
const range = req.headers.get("Range");
    const cleanRange = range ? range.replace(/[\r\n]/g, "") : null;

    const curlArgs = ["-sL", "-o", "-"];
    if (cleanRange) curlArgs.push("-H", `Range: ${cleanRange}`);
    curlArgs.push(videoUrl);

const curlProcess = spawn("curl", curlArgs);

    let closed = false;
    let idleTimeout = null;

    const decoder = new TextDecoder();
    let headerBuffer = "";
    let headersParsed = false;
    let status = 200;
    let contentType = "video/mp4";
    let contentLength = null;
    let contentRange = null;
    let acceptRanges = "bytes";
    let bodyStarted = false;

    return new Response(
      new ReadableStream({
        start(controller) {
          function resetTimeout() {
            clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
              closed = true;
              curlProcess.kill("SIGTERM");
              controller.error(new Error("Video proxy timeout"));
            }, 60000);
          }
          resetTimeout();

          let started = false;

          curlProcess.stdout.on("data", (chunk) => {
            resetTimeout();
            if (closed) return;
            if (!started) { started = true; bodyStarted = true; }
            try { controller.enqueue(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); } catch {}
          });

          curlProcess.on("close", (code) => {
            clearTimeout(idleTimeout);
            if (closed) return;
            closed = true;
            try {
              if (code !== 0) {
                controller.error(new Error(`Upstream returned error ${code}`));
              } else {
                controller.close();
              }
            } catch {}
          });

          curlProcess.on("error", (err) => { clearTimeout(idleTimeout); closed = true; controller.error(err); });
        },
      }),
      {
        status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
      }
    );
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/** @param {Request} req */
export async function handleProxyImage(req) {
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl) return json({ error: "Missing url parameter" }, 400);

  const validation = validateProxyUrl(imageUrl);
  if (!validation.valid) return json({ error: validation.error }, 400);

  try {
    const contentType = imageUrl.match(/\.(jpg|jpeg)$/i) ? "image/jpeg"
      : imageUrl.match(/\.png$/i) ? "image/png"
      : imageUrl.match(/\.gif$/i) ? "image/gif"
      : imageUrl.match(/\.svg$/i) ? "image/svg+xml"
      : imageUrl.match(/\.webp$/i) ? "image/webp"
      : "image/jpeg";

    const chunks = [];
    const curlProcess = spawn("curl", ["-sL", imageUrl]);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { curlProcess.kill(); reject(new Error("Timeout")); }, 15000);
      curlProcess.stdout.on("data", chunk => chunks.push(chunk));
      curlProcess.on("close", code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`curl ${code}`)); });
      curlProcess.on("error", err => { clearTimeout(timeout); reject(err); });
    });

    return new Response(Buffer.concat(chunks), {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "http://localhost:4321",
        "Access-Control-Allow-Credentials": "true",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
