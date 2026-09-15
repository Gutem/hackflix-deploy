/**
 * Shared response utilities for API routes.
 * @module packages/backend/src/lib/response
 */

/**
 * Create a JSON response with gzip compression and caching.
 * @param {*} data - Response body (will be JSON-stringified)
 * @param {number} [status=200] - HTTP status code
 * @returns {Response}
 */
export function json(data, status = 200) {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}

/**
 * Normalize contentIds to a user-facing contentAccess field.
 * @param {string[]} contentIds
 * @returns {string|"all"|Array}
 */
export function getContentAccess(contentIds) {
  if (!contentIds || !contentIds.length) return [];
  if (contentIds.length === 1 && contentIds[0] === "*") return "all";
  return contentIds;
}

/**
 * Build a user response object for API endpoints.
 * @param {Object} user - User context from auth middleware or user store
 * @param {boolean} [includeEmail=false] - Whether to include email field
 * @returns {Object}
 */
export function buildUserResponse(user, includeEmail = false) {
  const response = {
    id: user.id,
    username: user.username || null,
    tier: user.tier,
    contentAccess: getContentAccess(user.contentIds),
  };
  if (includeEmail && user.email) {
    response.email = user.email;
  }
  return response;
}

/**
 * Parse request body as JSON, returning empty object on failure.
 * @param {Request} req
 * @returns {Promise<Object>}
 */
export async function parseBody(req) {
  return req.json().catch(() => ({}));
}

/**
 * Find a conference by slug with null-safe store access.
 * @param {import('../../../ingest/src/conferences-store.js').ConferencesStore|null} store
 * @param {string} slug
 * @returns {Object|null}
 */
export function findConference(store, slug) {
  const decoded = decodeURIComponent(slug);
  return store ? store.findBySlug(decoded) : null;
}
