/**
 * Ingest CLI - manual and scheduled content ingestion.
 * @module packages/workers/src/cli
 *
 * Usage:
 *   bun run ingest                        # Run all connectors
 *   bun run ingest --source ccc           # Run single connector
 *   bun run ingest --source ccc --upsert  # Update existing items
 *   bun run ingest --status               # Show current status
 *   bun run ingest --list                 # List available connectors
 */

import { ContentStore } from "./store.js";
import { IngestPipeline } from "./pipeline.js";
import { createBuiltinConnectors } from "./connectors.js";
import { previewConferences, ingestConference } from "./supervised.js";
import { normalizeBatch } from "./normalize.js";

const args = process.argv.slice(2);

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) opts.source = args[++i];
    if (args[i] === "--upsert") opts.upsert = true;
    if (args[i] === "--status") opts.status = true;
    if (args[i] === "--list") opts.list = true;
    if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i], 10);
    if (args[i] === "--conference" && args[i + 1]) opts.conference = args[++i];
    if (args[i] === "--playlist" && args[i + 1]) opts.playlist = args[++i];
    if (args[i] === "--talk-url" && args[i + 1]) opts.talkUrl = args[++i];
    if (args[i] === "--data-dir" && args[i + 1]) opts.dataDir = args[++i];
    if (args[i] === "--migrate") opts.migrate = true;
    if (args[i] === "--supervised") opts.supervised = true;
    if (args[i] === "--help" || args[i] === "-h") opts.help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`Hackflix Content Ingest

Usage:
  bun run ingest [options]

Options:
  --source <name>       Run specific connector (ccc, peertube, defcon, infocon, youtube, ted)
  --supervised          Interactive ingest: preview each conference before fetching
  --upsert              Update existing items instead of skipping
  --limit <n>           Max items per connector
  --conference <name>   Fetch specific conference (e.g., 39c3)
  --playlist <id>       YouTube playlist ID or URL
  --talk-url <url>      TED/TEDx talk URL to ingest
  --migrate             Migrate content.json to per-conference files
  --data-dir <path>     Custom data directory
  --status              Show current content status
  --list                List available connectors
  --help, -h            Show this help
`);
}

/**
 * Supervised ingest - preview, select, and confirm per-conference.
 * @param {ContentStore} store
 */
async function runSupervised(store) {
  const previews = await previewConferences();

  if (previews.length === 0) {
    console.log("No conferences found.");
    return;
  }

  console.log(`\n${previews.length} conferences available.`);
  console.log(`Commands: [y]es/[a]dd, [n]o/[s]kip, [q]uit, add [A]ll remaining\n`);

  let totalAdded = 0;
  let totalErrors = 0;
  let addAllRemaining = false;

  for (let i = 0; i < previews.length; i++) {
    const conf = previews[i];
    const years = conf.years.length > 0 ? conf.years.map(y => String(y)).join(", ") : "no editions";
    const remaining = previews.length - i - 1;

    process.stdout.write(`\n[${i + 1}/${previews.length}] ${conf.name} (${conf.editions} editions: ${years}) [y/n/q/A]? `);

    const answer = await readLine();

    if (answer === "q") {
      console.log("Quitting.");
      break;
    }
    if (answer === "A") {
      addAllRemaining = true;
    }

    if (answer === "n" || answer === "s") {
      continue;
    }

    if (answer === "y" || answer === "a" || addAllRemaining) {
      process.stdout.write(`  Ingesting ${conf.name}...`);
      const result = await ingestConference(conf, async (items) => {
        const batchStats = store.addBatch(normalizeBatch(items), { upsert: true });
        store.persist();
        process.stdout.write(`.`);
      });
      console.log(` done. +${result.added} videos`);
      totalAdded += result.added;
      totalErrors += result.errors.length;
      for (const e of result.errors) {
        console.log(`    ✗ ${e.edition}: ${e.error}`);
      }
    }

    if (addAllRemaining && i % 10 === 0) {
      console.log(`\nProgress: ${i + 1}/${previews.length}, +${totalAdded} total`);
    }
  }

  console.log(`\nDone. Added ${totalAdded} videos across all selected conferences.`);
  if (totalErrors > 0) console.log(`${totalErrors} errors encountered.`);
}

/**
 * Read a single line from stdin.
 * @returns {Promise<string>}
 */
function readLine() {
  return new Promise((resolve) => {
    const { stdin } = process;
    const listener = (data) => {
      stdin.removeListener("data", listener);
      resolve(data.toString().trim().toLowerCase());
    };
    stdin.on("data", listener);
    stdin.resume();
  });
}

async function main() {
  const opts = parseArgs(args);

  if (opts.help) {
    printHelp();
    return;
  }

  const store = new ContentStore({ dataDir: opts.dataDir });
  await store.load();

  const pipeline = new IngestPipeline({ store });
  const connectorOpts = {
    youtube: {
      playlistId: opts.playlist || process.env.YOUTUBE_PLAYLIST_ID,
      limit: opts.limit,
    },
    ccc: {
      limitPerConference: opts.limit,
    },
    peertube: {
      limit: opts.limit,
    },
    infocon: {
      limit: opts.limit,
    },
    ted: {
      talkUrls: opts.talkUrl ? [opts.talkUrl] : [],
      event: opts.conference,
      year: opts.year,
    },
  };
  const builtinConnectors = createBuiltinConnectors(connectorOpts);

  if (opts.list) {
    console.log("Available connectors:");
    for (const [name] of builtinConnectors) {
      const items = store.getBySource(name);
      console.log(`  ${name} (${items.length} items in store)`);
    }
    return;
  }

  if (opts.migrate) {
    store.migrate();
    if (!opts.source) return;
  }

  if (opts.supervised) {
    await runSupervised(store);
    return;
  }

  if (opts.status) {
    const stats = store.getSourceStats();
    console.log("Content Store Status:");
    console.log(`  Total items: ${store.size()}`);
    console.log(`  Last ingest: ${store.metadata.lastIngest || "never"}`);
    for (const [source, count] of Object.entries(stats)) {
      console.log(`  ${source}: ${count} items`);
    }
    return;
  }

  for (const [name, connector] of builtinConnectors) {
    pipeline.registerConnector(name, connector);
  }

  if (opts.source) {
    console.log(`Running connector: ${opts.source}...`);
    try {
      const stats = await pipeline.run(opts.source, opts);
      console.log(`  Added: ${stats.added}, Duplicates: ${stats.duplicates}, Updated: ${stats.updated}`);
      console.log(`  Total in store: ${stats.total}`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log("Running all connectors...");
    const results = await pipeline.runAll(opts);
    for (const r of results) {
      if (r.error) {
        console.log(`  ${r.source}: ERROR - ${r.error}`);
      } else {
        console.log(`  ${r.source}: +${r.added} added, ${r.duplicates} dupes, ${r.updated} updated`);
      }
    }
    console.log(`Total in store: ${store.size()}`);
  }
}

main().catch((e) => {
  console.error("Ingest failed:", e);
  process.exit(1);
});
