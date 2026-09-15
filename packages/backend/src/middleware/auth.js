/**
 * Authentication middleware. JWT only — no anonymous/guest access.
 * All routes require valid authentication unless explicitly excluded.
 * @module packages/backend/src/middleware/auth
 */

import { jwtVerify } from "../lib/auth.js";

export class AuthMiddleware {
  /**
   * @param {Object} options
   * @param {import('../services/user-store.js').UserStore} options.userDb
   * @param {string} options.jwtSecret
   */
  constructor(options = {}) {
    this.userDb = options.userDb || null;
    this.jwtSecret = options.jwtSecret;
  }

  /**
   * Authenticate request via JWT Bearer token or cookie.
   * Sets context.user on success, returns null if not authenticated.
   * @param {Request} req
   * @param {Object} context
   * @returns {Promise<Object|null>}
   */
  async authenticate(req, context) {
    const authHeader = req.headers.get("Authorization");
    let token = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    if (!token) {
      const cookieHeader = req.headers.get("Cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)hackflix_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    // API Key header
    if (!token) {
      const apiKey = req.headers.get("x-api-key") || new URL(req.url).searchParams.get("api_key");
      if (apiKey && this.userDb) {
        const dbUser = this.userDb.findByApiKey(apiKey);
        if (dbUser) {
          context.user = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            tier: dbUser.tier,
            contentIds: dbUser.contentIds,
            authenticated: true,
          };
          return context.user;
        }
      }
    }

    if (!token) {
      context.user = null;
      return null;
    }

    const payload = jwtVerify(token, this.jwtSecret);
    if (!payload) {
      context.user = null;
      return null;
    }

    if (this.userDb) {
      const dbUser = this.userDb.findById(payload.sub);
      if (!dbUser) {
        context.user = null;
        return null;
      }
      context.user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        tier: dbUser.tier,
        contentIds: dbUser.contentIds,
        authenticated: true,
      };
      return context.user;
    }

    context.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      tier: payload.tier,
      contentIds: payload.contentIds || [],
      authenticated: true,
    };
    return context.user;
  }
}
