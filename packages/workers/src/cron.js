/**
 * Cron scheduler for periodic content ingestion.
 * @module packages/workers/src/cron
 *
 * Usage:
 *   bun run ingest:cron                    # Run with default interval (6h)
 *   INTERVAL=3600 bun run ingest:cron      # Custom interval in seconds
 *
 * Or use system cron:
 *   0 */6 * * * cd /path/to/hackflix && bun run ingest
 */

import { ContentStore } from "./store.js";
import { IngestPipeline } from "./pipeline.js";
import { createBuiltinConnectors } from "./connectors.js";

const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000;

async function runIngest() {
  const store = new ContentStore();
  store.load();

  const pipeline = new IngestPipeline({ store });
  const connectors = createBuiltinConnectors();

  for (const [name, connector] of connectors) {
    pipeline.registerConnector(name, connector);
  }

  console.log(`[${new Date().toISOString()}] Starting scheduled ingest...`);
  const results = await pipeline.runAll({ upsert: true });

  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.source}: ERROR - ${r.error}`);
    } else {
      console.log(`  ${r.source}: +${r.added} added, ${r.duplicates} dupes, ${r.updated} updated`);
    }
  }

  console.log(`Total in store: ${store.size()}`);
  return results;
}

async function main() {
  const intervalMs = (parseInt(process.env.INTERVAL, 10) || DEFAULT_INTERVAL / 1000) * 1000;

  console.log(`Cron ingest running every ${intervalMs / 1000 / 60} minutes`);
  console.log("Press Ctrl+C to stop\n");

  await runIngest();

  setInterval(runIngest, intervalMs);
}

main().catch((e) => {
  console.error("Cron ingest failed:", e);
  process.exit(1);
});
