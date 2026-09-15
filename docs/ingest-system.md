# Ingest System

The ingest system is an **independent operation** that fetches content from external sources, deduplicates, and persists to disk. The API server loads from the persisted data at startup.

## Architecture

```
                   ┌──────────────────┐
  CLI ────────────►│                  │
  Cron ───────────►│ IngestPipeline   │
  RSS ────────────►│                  │
  Admin API ──────►│                  │
                   └───────┬──────────┘
                           │
                    ┌──────▼──────┐
                    │ ContentStore │
                    │ (JSON file)  │
                    └──────┬──────┘
                           │ load()
                    ┌──────▼──────┐
                    │ Backend API  │
                    └─────────────┘
```

## Manual Ingest (CLI)

```bash
# Run all connectors
bun run ingest

# Run specific connector
bun run ingest --source ccc

# Update existing items
bun run ingest --source ccc --upsert

# Fetch specific conference
bun run ingest --source ccc --conference 39c3

# Limit items
bun run ingest --source peertube --limit 10

# Show status
bun run ingest --status

# List connectors
bun run ingest --list

# Custom data directory
bun run ingest --data-dir /path/to/data
```

## Scheduled Ingest (Cron)

```bash
# Default: every 6 hours
bun run ingest:cron

# Custom interval (seconds)
INTERVAL=3600 bun run ingest:cron
```

Or use system crontab:
```
0 */6 * * * cd /path/to/hackflix && bun run ingest
```

## RSS Feed Monitoring

Content sources publish RSS feeds that can be polled for new content:

| Source | Feed URL |
|--------|----------|
| CCC (39C3) | `https://api.media.ccc.de/public/conferences/39c3/podcast/mp4.xml` |
| CCC (38C3) | `https://api.media.ccc.de/public/conferences/38c3/podcast/mp4.xml` |
| PeerTube | `https://peertube.lhc.net.br/feeds/videos.xml` |

## Deduplication

Deduplication is by **content ID** (e.g., `ccc-<guid>`, `peertube-<uuid>`).

| Mode | Behavior |
|------|----------|
| Default | Skip duplicates (return count in stats) |
| `upsert: true` | Update existing items with new data |

```json
// addBatch() returns:
{ "added": 5, "duplicates": 95, "updated": 0 }
```

## Normalization

All content from different sources is normalized to a consistent schema before storage:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Content title |
| `description` | string | Description text |
| `thumbnail` | string | Thumbnail URL |
| `poster` | string | Poster URL |
| `duration` | number | Duration in minutes |
| `year` | number | Year of release |
| `speakers` | string[] | Array of speaker names |
| `tags` | string[] | Array of tags |
| `viewCount` | number | View count |
| `languages` | string[] | Array of language codes |
| `subtitles` | number | Count of available subtitles |
| `conference` | string | Conference name |
| `source` | string | Normalized source name (ccc, peertube, infocon) |
| `videoUrl` | string \| null | Direct video URL |
| `frontendUrl` | string | Original page URL |
| `updatedAt` | string | ISO timestamp |
| `extra` | object | Source-specific extra fields |

**Source Normalization:**
- `media.ccc.de` → `ccc`
- `peertube` → `peertube`
- `infocon`, `defcon` → `infocon`

**Language Normalization:**
- String `"eng"` → Array `["eng"]`
- String `"eng-deu"` → Array `["eng", "deu"]`
- Array stays as array

**Subtitles Normalization:**
- Object `{eng: "url"}` → Number `1`
- Number stays as number

Extra source-specific fields are preserved in the `extra` object.

## Content Store

Persisted as `packages/ingest/data/content.json`:

```json
{
  "metadata": {
    "lastIngest": "2024-01-01T12:00:00Z",
    "sourceStats": { "ccc": 100, "peertube": 50 },
    "totalItems": 150,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "items": [
    { "id": "ccc-abc123", "title": "...", ... },
    { "id": "peertube-def456", "title": "...", ... }
  ]
}
```

## Connectors

Each connector implements `fetchAll(options)` returning an array of content items:

| Connector | Source | Items | Video Format |
|-----------|--------|-------|--------------|
| `ccc` | media.ccc.de | ~100 (5 conferences) | MP4 direct CDN |
| `peertube` | peertube.lhc.net.br | ~50 | HLS (m3u8) |
| `infocon` | infocon.org | Variable (DEF CON) | MP4 direct |

## Triggering from Admin Panel

The admin backoffice can trigger ingest via the API:

```bash
# Run all connectors
curl -X POST -H "X-API-Key: <admin-key>" http://localhost:3001/api/admin/ingest/run

# Run specific connector
curl -X POST -H "X-API-Key: <admin-key>" \
  -H "Content-Type: application/json" \
  -d '{"source":"ccc","upsert":true}' \
  http://localhost:3001/api/admin/ingest/run
```

After ingest, the server reloads content from the store automatically.
