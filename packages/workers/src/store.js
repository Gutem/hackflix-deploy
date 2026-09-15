/**
 * Content store with JSON persistence and deduplication.
 * Persists items as per-conference files under data/conferences/.
 * Falls back to content.json for backward compatibility.
 * @module packages/workers/src/store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import { writeFile, readFile, readdir } from "fs/promises";
import { JsonStore } from "./json-store.js";

/**
 * Async: True if load() should use async I/O (default for non-test environments).
 * Tests may set this to false for synchronous loading.
 */
let USE_ASYNC_LOAD = true;

/** Force sync loading for test compatibility. */
export function setSyncLoad() { USE_ASYNC_LOAD = false; }

const CONTENT_FILE = "content.json";
const CONF_DIR = "conferences";

/**
 * Build a safe conference slug from source and conference name.
 * InfoCon is an aggregator - items are grouped by actual conference name + year.
 * Other sources (ccc, defcon, peertube) use source/conference.json.
 * @param {Object} item
 * @returns {string}
 */
function confSlug(item) {
  const src = (item.source || "unknown").toLowerCase();
  const conf = (item.conference || "unknown").toLowerCase();

  if (src === "infocon") {
    const parts = conf.split(/\s+/);
    const last = parts[parts.length - 1];
    if (/^\d{4}$/.test(last)) {
      const name = parts.slice(0, -1).join("-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return `${name}/${last}`;
    }
    if (/^\d{1,2}$/.test(last) && parts.length > 1) {
      return `${parts.join("-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    }
  }

  const clean = conf.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${src}/${clean}`;
}

export class ContentStore extends JsonStore {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for persistence
   */
  constructor(options = {}) {
    super({ ...options, fileName: CONTENT_FILE, dataKey: "items" });
    this.items = new Map();
    this.metadata = {
      lastIngest: null,
      sourceStats: {},
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Add a single content item.
   * @param {Object} item - Content item with `id` field
   * @param {Object} [options]
   * @param {boolean} [options.upsert=false] - Update if exists
   * @returns {boolean} Whether item was added/updated
   */
  add(item, options = {}) {
    if (this.items.has(item.id)) {
      if (options.upsert) {
        this.items.set(item.id, { ...item, updatedAt: new Date().toISOString() });
        return true;
      }
      return false;
    }
    this.items.set(item.id, { ...item, updatedAt: new Date().toISOString() });
    return true;
  }

  /**
   * Add multiple items with deduplication stats.
   * @param {Array<Object>} items
   * @param {Object} [options]
   * @param {boolean} [options.upsert=false]
   * @returns {{ added: number, duplicates: number, updated: number }}
   */
  addBatch(items, options = {}) {
    let added = 0;
    let duplicates = 0;
    let updated = 0;

    for (const item of items) {
      if (this.items.has(item.id)) {
        if (options.upsert) {
          this.items.set(item.id, { ...item, updatedAt: new Date().toISOString() });
          updated++;
        } else {
          duplicates++;
        }
      } else {
        this.items.set(item.id, { ...item, updatedAt: new Date().toISOString() });
        added++;
      }
    }

    return { added, duplicates, updated };
  }

  /**
   * Get item by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    return this.items.get(id) || null;
  }

  /**
   * Get all items as array.
   * @returns {Array<Object>}
   */
  getAll() {
    return [...this.items.values()];
  }

  /**
   * Get items by source.
   * @param {string} source
   * @returns {Array<Object>}
   */
  getBySource(source) {
    return this.getAll().filter((item) => item.source === source);
  }

  /**
   * Get count per source.
   * @returns {Object<string, number>}
   */
  getSourceStats() {
    const stats = {};
    for (const item of this.items.values()) {
      stats[item.source] = (stats[item.source] || 0) + 1;
    }
    return stats;
  }

  /**
   * Total item count.
   * @returns {number}
   */
  size() {
    return this.items.size;
  }

  /**
   * Remove item by ID.
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    return this.items.delete(id);
  }

  /**
   * Persist as per-conference files under data/conferences/.
   * Also moves old content.json out of the way if present.
   */
  /**
   * Persist as per-conference files (async, non-blocking).
   */
  async persist() {
    const confDir = join(this.dataDir, CONF_DIR);
    mkdirSync(confDir, { recursive: true });

    const meta = {
      ...this.metadata,
      lastIngest: new Date().toISOString(),
      sourceStats: this.getSourceStats(),
      totalItems: this.size(),
    };

    const files = new Map();
    for (const item of this.items.values()) {
      const slug = confSlug(item);
      if (!files.has(slug)) files.set(slug, []);
      files.get(slug).push(item);
    }

    const writes = [];
    for (const [slug, items] of files) {
      const [source, ...rest] = slug.split("/");
      const subDir = join(confDir, source);
      mkdirSync(subDir, { recursive: true });
      const filePath = join(subDir, `${rest.join("/")}.json`);
      const tmpPath = filePath + ".tmp";
      const data = { source, conference: slug, count: items.length, items };
      writes.push(writeFile(tmpPath, JSON.stringify(data)).then(() => renameSync(tmpPath, filePath)));
    }

    const metaPath = join(confDir, "metadata.json");
    const metaTmp = metaPath + ".tmp";
    writes.push(writeFile(metaTmp, JSON.stringify(meta)).then(() => renameSync(metaTmp, metaPath)));

    await Promise.all(writes);

    const oldPath = join(this.dataDir, CONTENT_FILE);
    if (existsSync(oldPath)) {
      const backupPath = join(this.dataDir, "content.json.bak");
      try { unlinkSync(backupPath); } catch {}
      try { renameSync(oldPath, backupPath); } catch {}
    }
  }

  /**
   * Load from per-conference files under data/conferences/.
   * Falls back to content.json if conferences directory doesn't exist.
   */
  /**
   * Load from per-conference files (async, non-blocking).
   * Falls back to content.json if conferences directory doesn't exist.
   */
  async load() {
    const confDir = join(this.dataDir, CONF_DIR);
    if (!existsSync(confDir)) {
      const data = this.loadRaw();
      if (!data) return;
      if (data.metadata) this.metadata = data.metadata;
      if (data.items) {
        for (const item of data.items) {
          this.items.set(item.id, item);
        }
      }
      return;
    }

    const metaPath = join(confDir, "metadata.json");
    if (existsSync(metaPath)) {
      try {
        const metaRaw = readFileSync(metaPath, "utf-8");
        this.metadata = JSON.parse(metaRaw);
      } catch {}
    }

    const self = this;
    const useAsync = USE_ASYNC_LOAD;

    async function scanDir(dir) {
      const names = useAsync ? await readdir(dir, { withFileTypes: true }) : readdirSync(dir, { withFileTypes: true });
      for (const entry of names) {
        if (entry.isDirectory()) {
          await scanDir(join(dir, entry.name));
        } else if (entry.name.endsWith(".json") && entry.name !== "metadata.json") {
          try {
            const filePath = join(dir, entry.name);
            const raw = useAsync ? await readFile(filePath, "utf-8") : readFileSync(filePath, "utf-8");
            const data = JSON.parse(raw);
            if (data && data.items) {
              for (const item of data.items) {
                self.items.set(item.id, item);
              }
            }
          } catch (e) {
            console.warn(`[ContentStore] Failed to parse ${entry.name}: ${e.message}`);
          }
        }
      }
    }
    await scanDir(confDir);
  }

  /**
   * Migrate from monolithic content.json to per-conference files.
   * Writes split files and renames original to content.json.bak.
   */
  async migrate() {
    const oldPath = join(this.dataDir, CONTENT_FILE);
    if (!existsSync(oldPath)) {
      console.log("Migrate: nothing to migrate");
      return;
    }

    const oldData = this.loadRaw();
    if (!oldData || !oldData.items) {
      console.log("Migrate: empty or invalid content.json");
      return;
    }

    if (oldData.metadata) this.metadata = oldData.metadata;
    for (const item of oldData.items) {
      this.items.set(item.id, item);
    }

    console.log(`Migrate: splitting ${this.items.size} items into conference files...`);
    await this.persist();
    console.log(`Migrate: done. Old file moved to content.json.bak`);
  }
}
