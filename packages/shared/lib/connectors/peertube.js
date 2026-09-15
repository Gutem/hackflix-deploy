/**
 * PeerTube API Connector
 * @module packages/shared/lib/connectors/peertube
 */

import { buildContentItem } from "./content-item.js";

const PEERTUBE_API_BASE = "https://peertube.lhc.net.br/api/v1";

/**
 * Fetch videos from PeerTube instance
 * @param {Object} options
 * @param {number} [options.count=20] - Number of videos to fetch
 * @param {number} [options.start=0] - Offset for pagination
 * @param {string} [options.sort=-publishedAt] - Sort order
 * @param {string} [options.category] - Filter by category ID
 * @returns {Promise<Array>}
 */
export async function fetchVideos({ count = 20, start = 0, sort = "-publishedAt", category } = {}) {
  const params = new URLSearchParams({
    count: count.toString(),
    start: start.toString(),
    sort
  });
  
  if (category) {
    params.set("categoryOneOf", category);
  }
  
  const res = await fetch(`${PEERTUBE_API_BASE}/videos?${params}`);
  
  if (!res.ok) {
    throw new Error(`PeerTube API error: ${res.status}`);
  }
  
  const data = await res.json();
  return data.data || [];
}

/**
 * Fetch a single video by UUID
 * @param {string} uuid - Video UUID
 * @returns {Promise<Object|null>}
 */
export async function fetchVideo(uuid) {
  const res = await fetch(`${PEERTUBE_API_BASE}/videos/${uuid}`);
  
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`PeerTube API error: ${res.status}`);
  }
  
  return res.json();
}

/**
 * Get video streaming URL (prefers direct MP4 over HLS)
 * @param {Object} video - Video object from PeerTube API
 * @returns {string|null}
 */
export function getVideoUrl(video) {
  if (video.streamingPlaylists?.[0]?.playlistUrl) {
    return video.streamingPlaylists[0].playlistUrl;
  }
  
  if (video.files?.length > 0) {
    const hd = video.files.find(f => f.resolution?.id === 1080) || video.files[0];
    return hd.fileUrl || hd.fileDownloadUrl || null;
  }
  
  if (video.streamingPlaylists?.[0]?.files?.length > 0) {
    const hd = video.streamingPlaylists[0].files.find(f => f.resolution?.id === 1080) || video.streamingPlaylists[0].files[0];
    return hd.fileUrl || hd.fileDownloadUrl || null;
  }
  
  return null;
}

/**
 * Transform PeerTube video to internal format
 * @param {Object} video - Video from PeerTube API
 * @returns {Object}
 */
export function transformVideo(video) {
  const baseUrl = `https://${video.account?.host || 'peertube.lhc.net.br'}`;
  const videoUrl = getVideoUrl(video);

  return buildContentItem(
    {
      id: `peertube-${video.uuid}`,
      title: video.name,
      source: "peertube",
      videoUrl,
    },
    {
      description: video.description || video.truncatedDescription || "",
      thumbnail: video.thumbnailPath ? `${baseUrl}${video.thumbnailPath}` : "",
      poster: video.previewPath ? `${baseUrl}${video.previewPath}` : "",
      duration: Math.floor((video.duration || 0) / 60),
      year: video.publishedAt ? new Date(video.publishedAt).getFullYear() : new Date().getFullYear(),
      speakers: video.account ? [video.account.displayName || video.account.name] : [],
      tags: [video.category?.label, video.channel?.displayName].filter(Boolean),
      viewCount: video.views || 0,
      languages: video.language?.id ? [video.language.id] : [],
      conference: video.channel?.displayName || "PeerTube",
      frontendUrl: video.url,
      embedUrl: `${baseUrl}${video.embedPath}`,
      isLive: video.isLive || false,
      account: video.account?.displayName || "Unknown",
      channel: video.channel?.displayName || "Unknown",
      host: video.account?.host || "peertube.lhc.net.br",
      updatedAt: video.updatedAt || new Date().toISOString(),
    }
  );
}

/**
 * Fetch all videos and transform them
 * @param {Object} options
 * @param {number} [options.limit=50] - Maximum videos to fetch
 * @returns {Promise<Array>}
 */
export async function fetchAll({ limit = 50 } = {}) {
  const videos = await fetchVideos({ count: limit });
  return videos.map(transformVideo);
}

export default {
  fetchVideos,
  fetchVideo,
  getVideoUrl,
  transformVideo,
  fetchAll
};
