/**
 * Hackflix API Server — serves frontend + admin at same origin.
 * @module packages/backend/src/server
 */

import { readFileSync } from "fs";
import { ContentService } from "./services/content.js";
import { UserStore } from "./services/user-store.js";
import { AuthMiddleware } from "./middleware/auth.js";
import { ContentStore } from "../../workers/src/store.js";
import { ConferencesStore } from "../../workers/src/conferences-store.js";
import { IngestPipeline } from "../../workers/src/pipeline.js";
import { createAdminRouter } from "../../backoffice/src/routes/admin.js";
import { renderAdminLogin, renderAdminApp } from "../../backoffice/src/routes/admin-pages.js";
import { createBuiltinConnectors } from "../../workers/src/connectors.js";
import { createApiRouter } from "./routes/api.js";
import { createStaticHandler } from "./lib/static.js";
import { join } from "path";

const PORT = process.env.PORT || 3001;
const DEFAULT_DATA_DIR = new URL("../../ingest/data", import.meta.url).pathname;
const DEFAULT_BACKEND_DATA_DIR = new URL("../data", import.meta.url).pathname;
const JWT_SECRET = process.env.JWT_SECRET || "hackflix-dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;

const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = process.env.NODE_ENV === "test" ? 100 : 6;

function checkRateLimit(ip, key = "") {
  const limitKey = key ? `${ip}:${key}` : ip;
  const now = Date.now();
  const entry = rateLimits.get(limitKey);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimits.set(limitKey, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now - entry.start > RATE_LIMIT_WINDOW) rateLimits.delete(key);
  }
}, 300000).unref();

async function createServer() {
  const CONFERENCE_ALIASES = {
    "Chaos Computer Club - Congress": ["C3:"],
    "Chaos Computer Club - Camp": ["CCCamp"],
    "DEF CON": ["DEF CON"],
  };

  const contentService = new ContentService({ conferenceAliases: CONFERENCE_ALIASES });
  const userStore = new UserStore({ dataDir: DEFAULT_BACKEND_DATA_DIR });
  userStore.load();

  const adminPassword = process.env.ADMIN_PASSWORD || "hackflix";
  const demoPassword = process.env.DEMO_PASSWORD || "demo";
  const premiumPassword = process.env.PREMIUM_PASSWORD || "premium";

  const existingUsernames = new Set(userStore.list().map((u) => u.username));
  if (!existingUsernames.has("admin")) {
    userStore.create({ username: "admin", email: "admin@hackflix.dev", password: adminPassword, tier: "admin", contentIds: ["*"] });
    userStore.persist();
  }
  if (!existingUsernames.has("demo")) {
    userStore.create({ username: "demo", email: "demo@hackflix.dev", password: demoPassword, tier: "basic", contentIds: ["39c3", "38c3"] });
    userStore.persist();
  }
  if (!existingUsernames.has("premium")) {
    userStore.create({ username: "premium", email: "premium@hackflix.dev", password: premiumPassword, tier: "premium", contentIds: ["*"] });
    userStore.persist();
  }

  const auth = new AuthMiddleware({ userDb: userStore, jwtSecret: JWT_SECRET });

  const dataDir = process.env.DATA_DIR || DEFAULT_DATA_DIR;
  const ingestStore = new ContentStore({ dataDir });
  await ingestStore.load();

  for (const item of ingestStore.getAll()) {
    contentService.addContent(item);
  }

  const conferencesStore = new ConferencesStore({ dataDir });
  conferencesStore.load();

  const pipeline = new IngestPipeline({ store: ingestStore });
  const builtinConnectors = createBuiltinConnectors();
  for (const [name, connector] of builtinConnectors) {
    pipeline.registerConnector(name, connector);
  }

  const apiRouter = createApiRouter({ contentService, userStore, jwtSecret: JWT_SECRET, conferencesStore });
  const adminRouter = createAdminRouter({ userStore, contentService, ingestStore, pipeline });

  const publicDir = join(import.meta.dir, "..", "..", "web", "public");
  const staticHandler = createStaticHandler(publicDir);

  const adminJsPath = join(import.meta.dir, "..", "..", "backoffice", "public", "admin-app.js");
  const cachedAdminJs = readFileSync(adminJsPath, "utf-8");

  console.log(`\n=== Hackflix API Server ===`);
  console.log(`Content:  ${ingestStore.size()} items`);
  console.log(`Users:    ${userStore.size()}`);
  console.log(`JWT:      HS256 (24h expiry)`);
  console.log(`Admin:    http://localhost:${PORT}/admin`);
  console.log(`===========================\n`);

  async function handleRequest(req) {
    const url = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const context = {};

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": FRONTEND_URL,
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, X-CSRF-Token, Range",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({ error: "Too many attempts" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Admin SPA — serve HTML pages
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      await auth.authenticate(req, context);
      if (!context.user || context.user.tier !== "admin") {
        return new Response(renderAdminLogin(FRONTEND_URL), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      const page = url.pathname.replace(/^\/admin/, "") || "/";
      return new Response(renderAdminApp(page, context.user, FRONTEND_URL), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Admin JS bundle
    if (url.pathname === "/admin-app.js") {
      return new Response(cachedAdminJs, {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }

    // Admin API routes
    if (url.pathname.startsWith("/api/admin")) {
      await auth.authenticate(req, context);
      return adminRouter(req, context);
    }

    if (url.pathname.startsWith("/api")) {
      await auth.authenticate(req, context);
      return apiRouter(req, context);
    }

    const staticResponse = staticHandler.serve(url.pathname || "/");
    if (staticResponse) return staticResponse;

    return new Response(JSON.stringify({ name: "Hackflix API" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      try {
        const response = await handleRequest(req);
        if (!response.headers.has("Access-Control-Allow-Origin")) {
          response.headers.set("Access-Control-Allow-Origin", FRONTEND_URL);
          response.headers.set("Access-Control-Allow-Credentials", "true");
        }
        if (!response.headers.has("Access-Control-Allow-Headers")) {
          response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, Range");
        }
        if (!response.headers.has("Content-Security-Policy")) {
          const apiOrigin = `http://localhost:${PORT}`;
          response.headers.set("Content-Security-Policy",
            `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; media-src blob: https: ${apiOrigin}; connect-src 'self' ${apiOrigin}; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.youtube-nocookie.com`);
        }
        return response;
      } catch (error) {
        console.error("Server error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  });

  console.log(`Server running at http://localhost:${PORT}`);
  return { server, userStore, contentService, ingestStore };
}

createServer().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});
