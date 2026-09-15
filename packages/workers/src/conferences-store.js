/**
 * Conferences store with JSON persistence.
 * Pre-computed conference list loaded from ingest, not fetched in real-time.
 * @module packages/workers/src/conferences-store
 */

import { JsonStore } from "./json-store.js";

const CONFERENCES_FILE = "conferences.json";

export class ConferencesStore extends JsonStore {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir]
   */
  constructor(options = {}) {
    super({ ...options, fileName: CONFERENCES_FILE, dataKey: "conferences" });
    this.conferences = [];
    this.metadata = {
      lastUpdate: null,
      total: 0,
    };
  }

  /**
   * Replace all conferences.
   * @param {Array<{ name: string, slug: string, path: string, logo: string|null }>} conferences
   */
  set(conferences) {
    this.conferences = conferences;
  }

  /**
   * Get all conferences.
   * @returns {Array}
   */
  getAll() {
    return this.conferences;
  }

  /**
   * Get conference count.
   * @returns {number}
   */
  size() {
    return this.conferences.length;
  }

  findBySlug(slug) {
    return this.conferences.find(c => c.slug === slug) || null;
  }

  persist() {
    this.persistData({
      metadata: {
        lastUpdate: new Date().toISOString(),
        total: this.conferences.length,
      },
      conferences: this.conferences,
    });
  }

  load() {
    const data = this.loadRaw();
    if (!data) return;

    if (data.metadata) {
      this.metadata = data.metadata;
    }

    this.conferences = data.conferences || [];
  }
}
