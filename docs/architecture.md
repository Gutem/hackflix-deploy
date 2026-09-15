# Architecture

## Overview

Hackflix is a monorepo with 5 packages following a **dumb client + smart API** pattern.

```
hackflix/
├── packages/
│   ├── shared/       # Shared libraries, connectors, utilities
│   ├── ingest/       # Content ingestion pipeline (independent)
│   ├── backend/      # API server (Bun, no framework)
│   ├── web/          # Frontend (Astro static + vanilla JS)
│   └── desktop/      # Desktop app (Tauri)
├── tests/            # All tests (unit, integration, e2e)
├── docs/             # Wiki documentation
└── package.json      # Workspace root
```

## Package Dependencies

```
shared ──► ingest ──► backend ──► web
                        │           │
                        └───────────┘ (API calls)
                        
desktop ──► web + backend (Tauri wrapper)
```

## Data Flow

```
Content Sources          Ingest Pipeline           Backend API            Frontend
─────────────          ───────────────           ────────────           ────────
media.ccc.de ─┐                                  ┌── GET /api/playlist
              │     ┌──────────────┐             │
peertube.lhc ─┼────►│  ContentStore│◄── load() ──┤── GET /api/content/:id
              │     │  (JSON file) │             │
infocon.org ──┘     │  Dedup + persist           └── GET /api/search
                    └──────────────┘
                     ▲    │
              CLI ───┘    └── persist()
              Cron ───┘
              RSS  ───┘
```

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Runtime | Bun | Fast startup, native APIs, test runner |
| Framework | None (backend) | Minimal dependencies, full control |
| Frontend | Astro static + vanilla JS | No SPA bloat, SEO-friendly, Tauri-compatible |
| State | JSON files on disk | Simple, no database needed |
| Auth | API keys (not JWT) | Simple, stateless, CLI-friendly |
| Desktop | Tauri | Lightweight, Rust-based, <10MB binary |

## User Tiers

| Tier | Access | Content |
|------|--------|---------|
| `anonymous` | No API key | 35C3 only (20 talks) |
| `basic` | Demo API key | 39C3 + 38C3 (40 talks) |
| `premium` | Premium API key | All content |
| `admin` | Admin API key | All content + admin panel |

## Content Schema

Every content item has this shape:

```json
{
  "id": "ccc-abc123",
  "title": "Talk Title",
  "description": "Talk description...",
  "thumbnail": "https://...",
  "poster": "https://...",
  "duration": 45,
  "year": 2024,
  "speakers": ["Speaker Name"],
  "tags": ["security", "hacking"],
  "viewCount": 1234,
  "languages": "eng",
  "subtitles": 2,
  "conference": "39C3",
  "source": "ccc",
  "videoUrl": "https://...",
  "frontendUrl": "https://...",
  "updatedAt": "2024-01-01T00:00:00Z",
  "videosByLanguage": {
    "eng": { "url": "https://...", "width": 1920, "height": 1080 },
    "deu": { "url": "https://...", "width": 1920, "height": 1080 }
  },
  "subtitlesByLanguage": {
    "eng": "https://...vtt",
    "deu": "https://...vtt"
  }
}
```

### Multi-Language Fields

| Field | Type | Description |
|-------|------|-------------|
| `videosByLanguage` | `object` | Maps language code to `{url, width, height}` |
| `subtitlesByLanguage` | `object` | Maps language code to subtitle VTT URL |
| `videoUrl` | `string` | Fallback video URL (first language) |
| `languages` | `string` | Available languages (e.g., "eng-deu-fra") |
| `subtitles` | `number` | Count of subtitle tracks |

See [Multi-Language Audio & Subtitles](./multi-language.md) for details.

## File Layout Details

### Backend (`packages/backend/src/`)
```
server.js              # Entry point, Bun.serve
middleware/auth.js      # AuthN/AuthZ middleware
services/content.js     # Content + ACL logic
services/user-store.js  # User persistence (NEW)
routes/api.js           # Public API routes
routes/admin.js         # Admin API routes (NEW)
lib/api-keys.js         # Key generation/hashing
```

### Ingest (`packages/ingest/src/`)
```
store.js               # ContentStore - JSON persistence + dedup
pipeline.js            # IngestPipeline - orchestrates connectors
connectors.js          # Wraps shared lib connectors for pipeline
rss.js                 # RSS feed parser + monitor
cli.js                 # Manual ingest CLI
cron.js                # Scheduled ingest
```

### Shared (`packages/shared/lib/`)
```
connectors/media-ccc.js   # CCC API connector
connectors/peertube.js    # PeerTube API connector
connectors/infocon.js     # InfoCon DEF CON connector
movies.js                 # Movie data helpers
search.js                 # Fuzzy search
store.js                  # IndexedDB wrapper (client-side)
api-client.js             # Backend API client
youtube.js                # YouTube embed utilities
```
