/**
 * Admin API routes. All endpoints require admin JWT.
 * @module packages/backoffice/src/routes/admin
 */

import { json, parseBody } from "../../../backend/src/lib/response.js";

/**
 * Create admin API router
 * @param {Object} options
 * @param {import('../services/user-store.js').UserStore} options.userStore
 * @param {import('../services/content.js').ContentService} options.contentService
 * @param {import('../../../ingest/src/store.js').ContentStore} options.ingestStore
 * @param {import('../../../ingest/src/pipeline.js').IngestPipeline} options.pipeline
 * @returns {Function}
 */
export function createAdminRouter(options) {
  const { userStore, contentService, ingestStore, pipeline } = options;

  return async (req, context) => {
    if (!context.user?.authenticated || context.user.tier !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/admin/, "");

    // USERS
    if (req.method === "GET" && path === "/users") {
      return json({ users: userStore.list() });
    }

    if (req.method === "POST" && path === "/users") {
      const body = await parseBody(req);
      try {
        const result = userStore.create({
          username: body.username || body.email?.split("@")[0],
          email: body.email || "",
          password: body.password || null,
          tier: body.tier || "basic",
          contentIds: body.contentIds || [],
        });
        userStore.persist();
        return json(result, 201);
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }

    if (req.method === "POST" && path.match(/^\/users\/([^/]+)\/reset-key$/)) {
      const id = path.replace("/users/", "").replace("/reset-key", "");
      const result = userStore.regenerateApiKey(id);
      if (!result) return json({ error: "User not found" }, 404);
      userStore.persist();
      return json(result);
    }

    if (req.method === "PATCH" && path.startsWith("/users/") && path.endsWith("/status")) {
      const id = path.replace("/users/", "").replace("/status", "");
      const body = await parseBody(req);      const updated = userStore.updateStatus(id, body.status);
      if (!updated) return json({ error: "User not found" }, 404);
      userStore.persist();
      return json(updated);
    }

    if (req.method === "PATCH" && path.startsWith("/users/")) {
      const id = path.replace("/users/", "");
      const body = await parseBody(req);      try {
        const updated = userStore.update(id, body);
        if (!updated) return json({ error: "User not found" }, 404);
        userStore.persist();
        return json(updated);
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }

    if (req.method === "DELETE" && path.startsWith("/users/")) {
      const id = path.replace("/users/", "");
      const result = userStore.remove(id);
      if (!result) return json({ error: "User not found" }, 404);
      userStore.persist();
      return json({ deleted: true });
    }

    // INGEST
    if (req.method === "GET" && path === "/ingest/status") {
      return json(pipeline ? pipeline.status() : { connectors: [], totalItems: ingestStore.size(), sourceStats: ingestStore.getSourceStats() });
    }

    if (req.method === "POST" && path === "/ingest/youtube") {
      const body = await parseBody(req);
      if (!body.playlistId && !body.playlistUrl) {
        return json({ error: "playlistId or playlistUrl required" }, 400);
      }
      if (!pipeline) return json({ error: "Ingest pipeline not available" }, 503);
      try {
        const stats = await pipeline.run("youtube", {
          upsert: true,
          playlistId: body.playlistId || body.playlistUrl,
        });
        reloadContent(contentService, ingestStore);
        return json({ results: [stats] });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    if (req.method === "POST" && path === "/ingest/run") {
      const body = await parseBody(req);      if (!pipeline) return json({ error: "Ingest pipeline not available" }, 503);
      let results;
      if (body.source) {
        try {
          const stats = await pipeline.run(body.source, { upsert: body.upsert, limit: body.limit });
          results = [stats];
        } catch (e) {
          results = [{ source: body.source, error: e.message, added: 0, duplicates: 0, updated: 0, total: ingestStore.size() }];
        }
      } else {
        results = await pipeline.runAll({ upsert: body.upsert });
      }
      reloadContent(contentService, ingestStore);
      return json({ results });
    }

    // CONTENT
    if (req.method === "GET" && path === "/content") {
      const items = ingestStore.getAll();
      return json({ items, total: items.length });
    }

    if (req.method === "GET" && path === "/content/sources") {
      const stats = ingestStore.getSourceStats();
      const sources = {};
      for (const [name, count] of Object.entries(stats)) {
        sources[name] = { count };
      }
      return json({ sources });
    }

    if (req.method === "PATCH" && path.startsWith("/content/")) {
      const contentId = decodeURIComponent(path.replace("/content/", ""));
      const item = ingestStore.get(contentId);
      if (!item) return json({ error: "Content not found" }, 404);
      const body = await parseBody(req);
      const editable = ["title", "description", "speakers", "conference", "year", "tags", "duration"];
      for (const key of editable) {
        if (body[key] !== undefined) {
          if (key === "speakers" && typeof body[key] === "string") {
            item[key] = body[key].split(",").map(s => s.trim()).filter(Boolean);
          } else if (key === "tags" && typeof body[key] === "string") {
            item[key] = body[key].split(",").map(t => t.trim()).filter(Boolean);
          } else if (key === "year" || key === "duration") {
            item[key] = parseInt(body[key], 10) || 0;
          } else {
            item[key] = body[key];
          }
        }
      }
      item.updatedAt = new Date().toISOString();
      await ingestStore.persist();
      reloadContent(contentService, ingestStore);
      return json({ updated: item });
    }

    if (req.method === "DELETE" && path.startsWith("/content/")) {
      const contentId = decodeURIComponent(path.replace("/content/", ""));
      const removed = ingestStore.remove(contentId);
      if (!removed) return json({ error: "Content not found" }, 404);
      await ingestStore.persist();
      reloadContent(contentService, ingestStore);
      return json({ deleted: true });
    }

    return json({ error: "Not found" }, 404);
  };
}

function reloadContent(contentService, ingestStore) {
  contentService.contentDb = ingestStore.getAll();
  contentService._buildContentMap();
}

