/**
 * Media.ccc.de API connector for fetching CCC conference recordings.
 * @module packages/shared/lib/connectors/media-ccc
 */

import { buildContentItem } from "./content-item.js";

/**
 * @typedef {Object} Recording
 * @property {string} mime_type - MIME type (video/mp4, audio/opus, text/vtt)
 * @property {string} language - Language code (eng, deu, fra, or combined like "eng-deu-fra")
 * @property {string} recording_url - Direct CDN URL
 * @property {number} [width] - Video width
 * @property {number} [height] - Video height
 * @property {number} [size] - File size in MB
 * @property {number} length - Duration in seconds
 * @property {boolean} high_quality - Is high quality
 */

/**
 * @typedef {Object} Event
 * @property {string} guid - Unique identifier
 * @property {string} title - Event title
 * @property {string} [subtitle] - Event subtitle
 * @property {string} slug - URL-friendly slug
 * @property {string} description - Event description
 * @property {string[]} persons - Speakers/presenters
 * @property {string[]} tags - Event tags
 * @property {number} view_count - Number of views
 * @property {number} length - Duration in seconds
 * @property {string} thumb_url - Thumbnail URL
 * @property {string} poster_url - Poster URL
 * @property {string} timeline_url - Timeline image URL
 * @property {string} thumbnails_url - VTT thumbnails URL
 * @property {string} frontend_link - Public URL
 * @property {string} date - Event date (ISO)
 * @property {string} original_language - Original language code
 * @property {string} conference_title - Conference title
 * @property {Recording[]} recordings - Available recordings
 */

/**
 * @typedef {Object} Conference
 * @property {string} acronym - Short acronym (e.g., "38c3")
 * @property {string} title - Conference title
 * @property {string} slug - URL slug (e.g., "congress/2024")
 * @property {string} [description] - Conference description
 * @property {string} logo_url - Logo URL
 */

/**
 * Connector for media.ccc.de API
 */
export class MediaCCCConnector {
  /**
   * @param {Object} [options] - Connector options
   * @param {string} [options.apiUrl] - API base URL
   */
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || "https://api.media.ccc.de/public";
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
  }

  /**
   * Fetch with caching
   * @param {string} url
   * @returns {Promise<any>}
   */
  async fetch(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${url}`);
    const data = await res.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data;
  }

  /** @returns {Promise<Conference[]>} */
  async getConferences() {
    const data = await this.fetch(`${this.apiUrl}/conferences`);
    return data.conferences || [];
  }

  /** @param {string} acronym */
  async getConference(acronym) {
    try {
      return await this.fetch(`${this.apiUrl}/conferences/${acronym}`);
    } catch {
      return null;
    }
  }

  /** @param {string} acronym */
  async getEvents(acronym) {
    const data = await this.fetch(`${this.apiUrl}/conferences/${acronym}`);
    return (data.events || []).map(e => ({ ...e, recordings: undefined }));
  }

  /** @param {string} guid */
  async getEvent(guid) {
    try {
      return await this.fetch(`${this.apiUrl}/events/${guid}`);
    } catch {
      return null;
    }
  }

  /**
   * Get events with recordings (slower, fetches each event)
   * @param {string} acronym
   * @param {{limit?: number}} [options]
   */
  async getEventsWithRecordings(acronym, options = {}) {
    const events = await this.getEvents(acronym);
    const limit = options.limit || events.length;
    const results = await Promise.all(
      events.slice(0, limit).map(e => this.getEvent(e.guid))
    );
    return results.filter(Boolean);
  }

  /**
   * Get best video recording
   * @param {Event} event
   * @returns {Recording|null}
   */
  getBestVideo(event) {
    const videos = event.recordings?.filter(r => 
      r.mime_type?.startsWith("video/") && r.high_quality
    ) || [];
    return videos.sort((a, b) => (b.height || 0) - (a.height || 0))[0] || null;
  }

  /**
   * Get video URLs by language - prefers single-language recordings
   * @param {Event} event
   * @returns {Object.<string, {url: string, width: number, height: number}>}
   */
  getVideosByLanguage(event) {
    const videos = event.recordings?.filter(r => 
      r.mime_type?.startsWith("video/") && r.high_quality
    ) || [];
    
    const byLang = {};
    
    // First pass: prefer single-language recordings
    for (const v of videos) {
      if (v.language && !v.language.includes("-")) {
        const lang = v.language;
        if (!byLang[lang] || (v.height || 0) > (byLang[lang].height || 0)) {
          byLang[lang] = {
            url: v.recording_url,
            width: v.width || null,
            height: v.height || null,
          };
        }
      }
    }
    
    // Second pass: fill missing languages from multi-language recordings
    for (const v of videos) {
      if (v.language && v.language.includes("-")) {
        const langs = v.language.split("-");
        for (const lang of langs) {
          if (!byLang[lang] || (v.height || 0) > (byLang[lang].height || 0)) {
            byLang[lang] = {
              url: v.recording_url,
              width: v.width || null,
              height: v.height || null,
            };
          }
        }
      }
    }
    
    return byLang;
  }

  /**
   * Get all available languages
   * @param {Event} event
   * @returns {string[]}
   */
  getLanguages(event) {
    const langs = new Set();
    event.recordings?.forEach(r => {
      if (r.language) {
        r.language.split("-").forEach(l => langs.add(l));
      }
    });
    return [...langs];
  }

  /**
   * Get subtitle URLs
   * @param {Event} event
   * @returns {Object.<string, string>}
   */
  getSubtitles(event) {
    const subs = {};
    event.recordings?.filter(r => r.mime_type === "text/vtt").forEach(r => {
      subs[r.language] = r.recording_url;
    });
    return subs;
  }

  /**
   * Convert to internal movie format
   * @param {Event} event
   * @returns {Object}
   */
  toMovieFormat(event) {
    const video = this.getBestVideo(event);
    const videosByLang = this.getVideosByLanguage(event);
    const year = event.date ? new Date(event.date).getFullYear() : new Date().getFullYear();
    
    return buildContentItem(
      {
        id: `ccc-${event.guid}`,
        title: event.title,
        source: "media.ccc.de",
        videoUrl: video?.recording_url || null,
      },
      {
        subtitle: event.subtitle || null,
        description: event.description || "",
        thumbnail: event.thumb_url || "",
        poster: event.poster_url || "",
        timeline: event.timeline_url || null,
        thumbnailsVtt: event.thumbnails_url || null,
        videoWidth: video?.width || null,
        videoHeight: video?.height || null,
        videosByLanguage: Object.keys(videosByLang).length > 1 ? videosByLang : null,
        duration: Math.floor((event.length || 0) / 60),
        year,
        speakers: event.persons || [],
        tags: event.tags || [],
        viewCount: event.view_count || 0,
        languages: this.getLanguages(event),
        subtitles: Object.keys(this.getSubtitles(event)).length,
        subtitlesByLanguage: this.getSubtitles(event),
        originalLanguage: event.original_language || "unknown",
        conference: event.conference_title || "",
        frontendUrl: event.frontend_link || "",
        sourceId: event.guid,
      }
    );
  }

  /**
   * Fetch all events from conference
   * @param {string} acronym
   * @param {{limit?: number}} [options]
   */
  async fetchAll(acronym, options = {}) {
    const events = await this.getEventsWithRecordings(acronym, options);
    return events.map(e => this.toMovieFormat(e));
  }

  clearCache() {
    this.cache.clear();
  }
}

export default MediaCCCConnector;
