/**
 * Hackflix Backoffice — Admin-only management server.
 * Standalone Bun server on port 3002.
 * @module packages/backoffice/src/server
 */

import { ContentService } from "../../backend/src/services/content.js";
import { UserStore } from "../../backend/src/services/user-store.js";
import { AuthMiddleware } from "../../backend/src/middleware/auth.js";
import { ContentStore } from "../../workers/src/store.js";
import { IngestPipeline } from "../../workers/src/pipeline.js";
import { createAdminRouter } from "./routes/admin.js";
import { renderAdminLogin, renderAdminApp } from "./routes/admin-pages.js";
import { createBuiltinConnectors } from "../../workers/src/connectors.js";
import { handleLogin } from "../../backend/src/routes/api/auth.js";

const PORT = process.env.BACKOFFICE_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || "hackflix-dev-secret";
const DATA_DIR = process.env.DATA_DIR || new URL("../../ingest/data", import.meta.url).pathname;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4321";

const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 6;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimits.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

async function createServer() {
  const contentService = new ContentService({});
  const userStore = new UserStore({ dataDir: new URL("../../backend/data", import.meta.url).pathname });
  userStore.load();

  const auth = new AuthMiddleware({ userDb: userStore, jwtSecret: JWT_SECRET });

  const ingestStore = new ContentStore({ dataDir: DATA_DIR });
  await ingestStore.load();

  for (const item of ingestStore.getAll()) {
    contentService.addContent(item);
  }

  const pipeline = new IngestPipeline({ store: ingestStore });
  const builtinConnectors = createBuiltinConnectors();
  for (const [name, connector] of builtinConnectors) {
    pipeline.registerConnector(name, connector);
  }

  const adminRouter = createAdminRouter({ userStore, contentService, ingestStore, pipeline });
  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  const cachedAdminJs = readFileSync(join(import.meta.dir, "..", "public", "admin-app.js"), "utf-8");

  console.log(`\n=== Hackflix Backoffice ===`);
  console.log(`Content:  ${ingestStore.size()} items`);
  console.log(`Users:    ${userStore.size()}`);
  console.log(`===========================\n`);

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const context = {};

      try {
        if (req.method === "POST" && url.pathname === "/api/auth/login") {
          const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
          if (!checkRateLimit(ip)) {
            return new Response(JSON.stringify({ error: "Too many attempts" }), {
              status: 429,
              headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
          }
          return await handleLogin(req, userStore, JWT_SECRET);
        }

        if (url.pathname === "/admin-app.js") {
          return new Response(cachedAdminJs, {
            headers: { "Content-Type": "application/javascript; charset=utf-8" },
          });
        }

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

        if (url.pathname.startsWith("/api/admin")) {
          await auth.authenticate(req, context);
          return adminRouter(req, context);
        }

        if (url.pathname === "/api/auth/login") {
          return adminRouter(req, context);
        }

        return new Response(JSON.stringify({ name: "Hackflix Backoffice" }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Backoffice error:", e);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  });

  console.log(`Backoffice running at http://localhost:${PORT}`);
  return server;
}

createServer().catch(e => { console.error("Failed to start backoffice:", e); process.exit(1); });
