/**
 * Base class for JSON file persistence.
 * @module packages/workers/src/json-store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DEFAULT_DATA_DIR = join(import.meta.dir, "..", "data");

/**
 * Base class providing JSON file persistence.
 * @abstract
 */
export class JsonStore {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for persistence
   * @param {string} options.fileName - JSON file name (e.g. "content.json")
   * @param {string} [options.dataKey] - Key name for the data array/object in the JSON file
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || DEFAULT_DATA_DIR;
    this.fileName = options.fileName;
    this.dataKey = options.dataKey || "items";
    this.metadata = {};

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Persist data and metadata to disk.
   * @param {Object} data - The full data object to write
   */
  persistData(data) {
    const filePath = join(this.dataDir, this.fileName);
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Load and parse JSON from disk.
   * @returns {Object|null} Parsed data or null if file doesn't exist
   */
  loadRaw() {
    const filePath = join(this.dataDir, this.fileName);
    if (!existsSync(filePath)) return null;

    try {
      const raw = readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[JsonStore] Failed to parse ${this.fileName}: ${e.message}`);
      return null;
    }
  }

  /**
   * Get total item count.
   * @returns {number}
   */
  size() {
    return 0;
  }
}
