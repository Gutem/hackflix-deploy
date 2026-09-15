/**
 * Ingest pipeline - orchestrates connectors with dedup and persistence.
 * @module packages/workers/src/pipeline
 */

import { normalizeBatch } from "./normalize.js";

export class IngestPipeline {
  /**
   * @param {Object} options
   * @param {import('./store.js').ContentStore} options.store
   */
  constructor({ store }) {
    this.store = store;
    this.connectors = new Map();
    this.lastRuns = new Map();
  }

  /**
   * Register a content connector.
   * @param {string} name
   * @param {{ fetchAll: (options?: Object) => Promise<Array<Object>> }} connector
   */
  registerConnector(name, connector) {
    this.connectors.set(name, connector);
  }

  /**
   * List registered connector names.
   * @returns {string[]}
   */
  connectorNames() {
    return [...this.connectors.keys()];
  }

  /**
   * Run a single connector.
   * @param {string} name
   * @param {Object} [options]
   * @param {boolean} [options.upsert=false]
   * @param {boolean} [options.normalize=true]
   * @returns {Promise<{ source: string, added: number, duplicates: number, updated: number, total: number, error?: string }>}
   */
  async run(name, options = {}) {
    const connector = this.connectors.get(name);
    if (!connector) throw new Error(`Connector '${name}' not found`);

    const { upsert, normalize = true, ...fetchOptions } = options;
    const self = this;
    
    let added = 0;
    let duplicates = 0;
    let updated = 0;
    let processedViaCallback = false;

    fetchOptions.onProgress = async (rawItems) => {
      processedViaCallback = true;
      const items = normalize ? normalizeBatch(rawItems) : rawItems;
      const batchStats = self.store.addBatch(items, { upsert });
      await self.store.persist();
      added += batchStats.added;
      duplicates += batchStats.duplicates;
      updated += batchStats.updated;
    };

    const rawItems = await connector.fetchAll(fetchOptions);

    if (!processedViaCallback) {
      const items = normalize ? normalizeBatch(rawItems) : rawItems;
      const finalStats = this.store.addBatch(items, { upsert });
      await this.store.persist();
      added += finalStats.added;
      duplicates += finalStats.duplicates;
      updated += finalStats.updated;
    }
    this.lastRuns.set(name, new Date().toISOString());

    return {
      source: name,
      added,
      duplicates,
      updated,
      total: this.store.size(),
    };
  }

  /**
   * Run all registered connectors.
   * @param {Object} [options]
   * @returns {Promise<Array<{ source: string, added: number, duplicates: number, updated: number, total: number, error?: string }>>}
   */
  async runAll(options = {}) {
    const results = [];

    for (const name of this.connectors.keys()) {
      try {
        const stats = await this.run(name, options);
        results.push(stats);
      } catch (e) {
        results.push({
          source: name,
          added: 0,
          duplicates: 0,
          updated: 0,
          total: this.store.size(),
          error: e.message,
        });
      }
    }

    return results;
  }

  /**
   * Get current pipeline status.
   * @returns {Object}
   */
  status() {
    return {
      connectors: this.connectorNames(),
      totalItems: this.store.size(),
      sourceStats: this.store.getSourceStats(),
      lastRun: Object.fromEntries(this.lastRuns),
    };
  }
}
