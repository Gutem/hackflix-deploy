/**
 * User store with JSON persistence, password auth, and API keys.
 * @module packages/backend/src/services/user-store
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { join } from "path";
import { createHash, randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "../lib/auth.js";

const DEFAULT_DATA_DIR = join(import.meta.dir, "..", "..", "data");
const USERS_FILE = "users.json";

export class UserStore {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir]
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || DEFAULT_DATA_DIR;
    /** @type {Map<string, Object>} id -> user */
    this.users = new Map();
    /** @type {Map<string, string>} username -> id */
    this.usernameIndex = new Map();
    /** @type {Map<string, string>} apiKeyHash -> id */
    this.apiKeyIndex = new Map();

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Create a new user.
   * @param {Object} data
   * @param {string} data.username
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} data.tier
   * @param {string[]} data.contentIds
   * @param {string} [data.status]
   * @returns {{id: string, username: string, email: string, tier: string, contentIds: string[], status: string}}
   */
  create(data) {
    const id = `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const username = data.username || data.email?.split("@")[0] || id;

    if (this.usernameIndex.has(username.toLowerCase())) {
      throw new Error(`Username "${username}" already exists`);
    }

    const apiKey = generateApiKey();

    const user = {
      id,
      username,
      email: data.email || "",
      passwordHash: data.password ? hashPassword(data.password) : null,
      tier: data.tier || "basic",
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPreview: apiKey.slice(0, 8),
      contentIds: data.contentIds || [],
      status: data.status || "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, user);
    this.usernameIndex.set(username.toLowerCase(), id);
    this.apiKeyIndex.set(user.apiKeyHash, id);

    return {
      id,
      username: user.username,
      email: user.email,
      tier: user.tier,
      apiKey, // Only returned once at creation
      contentIds: user.contentIds,
      status: user.status,
    };
  }

  /**
   * List all users (without sensitive data).
   * @returns {Array<Object>}
   */
  list() {
    return [...this.users.values()].map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      tier: u.tier,
      apiKeyPreview: u.apiKeyPreview || null,
      contentIds: u.contentIds,
      status: u.status,
      hasPassword: !!u.passwordHash,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  /**
   * Get user by ID (full record including passwordHash).
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    const user = this.users.get(id);
    if (!user) return null;
    return { ...user };
  }

  /**
   * Find user by username/email and verify password.
   * @param {string} username
   * @param {string} password
   * @returns {Object|null}
   */
  findByUsername(username, password) {
    const id = this.usernameIndex.get(username.toLowerCase());
    if (!id) return null;

    const user = this.users.get(id);
    if (!user || user.status === "blocked") return null;
    if (!user.passwordHash) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;

    return { ...user, authenticated: true };
  }

  /**
   * Find active user by ID (for JWT re-verification).
   * @param {string} id
   * @returns {Object|null}
   */
  findById(id) {
    const user = this.users.get(id);
    if (!user || user.status === "blocked") return null;
    return { ...user, authenticated: true };
  }

  /**
   * Update user fields.
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null}
   */
  update(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;

    if (updates.username && updates.username.toLowerCase() !== user.username.toLowerCase()) {
      if (this.usernameIndex.has(updates.username.toLowerCase())) {
        throw new Error(`Username "${updates.username}" already exists`);
      }
      this.usernameIndex.delete(user.username.toLowerCase());
      this.usernameIndex.set(updates.username.toLowerCase(), id);
    }

    const allowed = ["email", "tier", "contentIds", "username"];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    }
    if (updates.password) {
      user.passwordHash = hashPassword(updates.password);
    }
    user.updatedAt = new Date().toISOString();

    return { ...user };
  }

  /**
   * Update user status.
   * @param {string} id
   * @param {string} status
   * @returns {Object|null}
   */
  updateStatus(id, status) {
    const user = this.users.get(id);
    if (!user) return null;
    user.status = status;
    user.updatedAt = new Date().toISOString();
    return { ...user };
  }

  /**
   * Remove a user.
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    const user = this.users.get(id);
    if (!user) return false;
    this.usernameIndex.delete(user.username.toLowerCase());
    this.users.delete(id);
    return true;
  }

  /**
   * Find user by API key.
   * @param {string} key - Raw API key
   * @returns {Object|null}
   */
  findByApiKey(key) {
    const hash = hashApiKey(key);
    const id = this.apiKeyIndex.get(hash);
    if (!id) return null;
    const user = this.users.get(id);
    if (!user || user.status === "blocked") return null;
    return { ...user, authenticated: true };
  }

  /**
   * Regenerate API key for a user.
   * @param {string} id
   * @returns {{ apiKey: string }|null}
   */
  regenerateApiKey(id) {
    const user = this.users.get(id);
    if (!user) return null;
    const apiKey = generateApiKey();
    this.apiKeyIndex.delete(user.apiKeyHash);
    user.apiKeyHash = hashApiKey(apiKey);
    user.apiKeyPreview = apiKey.slice(0, 8);
    this.apiKeyIndex.set(user.apiKeyHash, id);
    user.updatedAt = new Date().toISOString();
    return { apiKey };
  }

  persist() {
    const filePath = join(this.dataDir, USERS_FILE);
    const tmpPath = filePath + ".tmp";
    const data = { users: Array.from(this.users.values()) };
    mkdirSync(this.dataDir, { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpPath, filePath);
  }

  load() {
    const filePath = join(this.dataDir, USERS_FILE);
    if (!existsSync(filePath)) return;
    let migrated = false;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (data.users) {
        for (const user of data.users) {
          this.users.set(user.id, user);
          if (user.username) {
            this.usernameIndex.set(user.username.toLowerCase(), user.id);
          }
          if (user.apiKeyHash) {
            this.apiKeyIndex.set(user.apiKeyHash, user.id);
          } else {
            // Migrate: generate API key for existing users
            const apiKey = generateApiKey();
            user.apiKeyHash = hashApiKey(apiKey);
            user.apiKeyPreview = apiKey.slice(0, 8);
            this.apiKeyIndex.set(user.apiKeyHash, user.id);
            migrated = true;
          }
        }
      }
    } catch (e) {
      console.warn(`[UserStore] Failed to parse ${USERS_FILE}: ${e.message}`);
    }
    if (migrated) this.persist();
  }

  size() {
    return this.users.size;
  }
}

/**
 * Generate a random API key (32 hex chars).
 * @returns {string}
 */
function generateApiKey() {
  return randomBytes(16).toString("hex");
}

/**
 * Hash an API key with SHA-256.
 * @param {string} key
 * @returns {string}
 */
function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}
