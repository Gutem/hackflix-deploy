/**
 * IndexedDB-based store for profiles, watchlist, and continue watching data.
 * Provides persistent storage in the browser.
 * @module packages/shared/lib/store
 */

const DB_NAME = "hackflix-db";
const DB_VERSION = 1;
const PROFILES_STORE = "profiles";

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(PROFILES_STORE)) {
        const store = database.createObjectStore(PROFILES_STORE, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }
    };
  });
}

/**
 * Get a transaction and object store
 * @param {string} storeName - Store name
 * @param {IDBTransactionMode} mode - Transaction mode
 * @returns {Promise<IDBObjectStore>}
 */
async function getStore(storeName, mode = "readonly") {
  const database = await initDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Create a new profile
 * @param {Object} data - Profile data
 * @param {string} data.name - Profile name
 * @param {string} data.avatar - Profile avatar emoji
 * @returns {Promise<Object>} Created profile
 */
export async function createProfile(data) {
  const store = await getStore(PROFILES_STORE, "readwrite");
  
  const profile = {
    id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: data.name,
    avatar: data.avatar,
    watchlist: [],
    continueWatching: [],
    createdAt: Date.now(),
    isActive: false,
  };

  const profiles = await getAllProfiles();
  if (profiles.length === 0) {
    profile.isActive = true;
  }

  return new Promise((resolve, reject) => {
    const request = store.add(profile);
    request.onsuccess = () => resolve(profile);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all profiles
 * @returns {Promise<Array<Object>>} Array of profiles
 */
export async function getAllProfiles() {
  const store = await getStore(PROFILES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a profile by ID
 * @param {string} profileId - Profile ID
 * @returns {Promise<Object|null>} Profile or null
 */
export async function getProfile(profileId) {
  const store = await getStore(PROFILES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(profileId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get active profile
 * @returns {Promise<Object|null>} Active profile or null
 */
export async function getActiveProfile() {
  const profiles = await getAllProfiles();
  return profiles.find((p) => p.isActive) || null;
}

/**
 * Set active profile
 * @param {string} profileId - Profile ID to set as active
 * @returns {Promise<void>}
 */
export async function setActiveProfile(profileId) {
  const profiles = await getAllProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  const store = await getStore(PROFILES_STORE, "readwrite");

  for (const p of profiles) {
    if (p.id === profileId) {
      p.isActive = true;
    } else {
      p.isActive = false;
    }
    await new Promise((resolve, reject) => {
      const request = store.put(p);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Delete a profile
 * @param {string} profileId - Profile ID to delete
 * @returns {Promise<void>}
 */
export async function deleteProfile(profileId) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  const wasActive = profile.isActive;
  const store = await getStore(PROFILES_STORE, "readwrite");

  await new Promise((resolve, reject) => {
    const request = store.delete(profileId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  if (wasActive) {
    const remaining = await getAllProfiles();
    if (remaining.length > 0) {
      await setActiveProfile(remaining[0].id);
    }
  }
}

/**
 * Add movie to watchlist
 * @param {string} profileId - Profile ID
 * @param {string} movieId - Movie ID to add
 * @returns {Promise<void>}
 */
export async function addToWatchlist(profileId, movieId) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  if (!profile.watchlist.includes(movieId)) {
    profile.watchlist.push(movieId);
    await saveProfile(profile);
  }
}

/**
 * Remove movie from watchlist
 * @param {string} profileId - Profile ID
 * @param {string} movieId - Movie ID to remove
 * @returns {Promise<void>}
 */
export async function removeFromWatchlist(profileId, movieId) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  profile.watchlist = profile.watchlist.filter((id) => id !== movieId);
  await saveProfile(profile);
}

/**
 * Get watchlist for a profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<Array<string>>} Array of movie IDs
 */
export async function getWatchlist(profileId) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  return [...profile.watchlist];
}

/**
 * Update continue watching progress
 * @param {string} profileId - Profile ID
 * @param {string} movieId - Movie ID
 * @param {number} progress - Progress percentage (0-100)
 * @returns {Promise<void>}
 */
export async function updateContinueWatching(profileId, movieId, progress) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  const existingIndex = profile.continueWatching.findIndex(
    (cw) => cw.movieId === movieId
  );

  const entry = {
    movieId,
    progress,
    timestamp: Date.now(),
  };

  if (existingIndex >= 0) {
    profile.continueWatching.splice(existingIndex, 1);
  }
  profile.continueWatching.unshift(entry);

  await saveProfile(profile);
}

/**
 * Get continue watching list for a profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<Array<Object>>} Array of continue watching entries
 */
export async function getContinueWatching(profileId) {
  const profile = await getProfile(profileId);
  
  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }

  return [...profile.continueWatching];
}

/**
 * Save a profile to the store
 * @param {Object} profile - Profile to save
 * @returns {Promise<void>}
 */
async function saveProfile(profile) {
  const store = await getStore(PROFILES_STORE, "readwrite");
  
  return new Promise((resolve, reject) => {
    const request = store.put(profile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all data from the store
 * @returns {Promise<void>}
 */
export async function clearStore() {
  const store = await getStore(PROFILES_STORE, "readwrite");
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get profiles (alias for getAllProfiles)
 * @returns {Promise<Array<Object>>} Array of profiles
 */
export const getProfiles = getAllProfiles;

export default {
  createProfile,
  getProfiles,
  getAllProfiles,
  getProfile,
  getActiveProfile,
  setActiveProfile,
  deleteProfile,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  updateContinueWatching,
  getContinueWatching,
  clearStore,
};
