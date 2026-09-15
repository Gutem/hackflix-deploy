# Development Guide

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Rust + cargo (for Tauri desktop app)
- `rustup target add aarch64-apple-darwin` (macOS universal build)

## Setup

```bash
bun install
```

## Common Commands

```bash
# Development
bun run dev                    # Start backend + frontend
bun run dev:backend            # Backend only (port 3001)
bun run dev:web                # Frontend only (port 4321)

# Content Ingest
bun run ingest                 # Run all connectors
bun run ingest --source ccc    # Run specific connector
bun run ingest --status        # Show content status
bun run ingest:cron            # Scheduled ingest (every 6h)

# Testing
bun test                       # Run all tests
bun test tests/unit/           # Unit tests only
bun test tests/integration/    # Integration tests
bun run test:coverage          # With coverage report

# E2E Testing (Playwright)
bun run test:e2e               # Run E2E tests (all browsers)
bun run test:e2e:chromium      # Chromium only
bun run test:e2e:firefox       # Firefox only

# Linting
bun run lint                   # Check code
bun run lint:fix               # Auto-fix

# Build
bun run build:web              # Build frontend
bun run build:desktop:macos    # Build macOS app

# Cleanup
bun run stop                   # Kill all running services
```

## Project Conventions

- **No TypeScript** - Vanilla JS with JSDoc type annotations
- **Bun first** - Runtime, bundler, package manager, test runner
- **No SPA frameworks** - Plain HTML/CSS/JS, Astro for static pages
- **TDD** - Write tests before implementation
- **85%+ coverage** target
- **Conventional Commits** - `feat:`, `fix:`, `docs:`, etc.
- **Feature branches** - Never commit directly to main

## Test Structure

```
tests/
├── unit/
│   ├── backend/        # API keys, auth, content service
│   ├── connectors/     # CCC, PeerTube, InfoCon connectors
│   ├── ingest/         # Store, pipeline, RSS parser
│   ├── movies.test.js  # Movie data helpers
│   ├── search.test.js  # Search utilities
│   └── youtube.test.js # YouTube embed utils
├── integration/        # API integration tests
└── e2e/
    ├── home.spec.js                  # Home page tests
    ├── movie-detail.spec.js          # Movie detail page tests
    └── audio-subtitle-switching.spec.js  # Audio/subtitle dropdown tests
```

Run with:
- `bun test` for unit tests
- `bun run test:e2e` for E2E tests
- `bun run test:e2e:firefox` for Firefox-only E2E tests

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend API port |
| `DEMO_API_KEY` | `7da6...1a57` | Demo user API key |
| `PREMIUM_API_KEY` | `8fda...991b` | Premium user API key |
| `ADMIN_API_KEY` | (generated) | Admin user API key |
| `DATA_DIR` | `packages/ingest/data` | Content store directory |
| `INTERVAL` | 21600 | Cron ingest interval (seconds) |

## Port Usage

| Port | Service |
|------|---------|
| 3001 | Backend API |
| 4321 | Frontend (Astro dev) |

**Kill services:**
```bash
bun run stop
# OR manually:
pkill -f "packages/backend/src/server"
pkill -f "astro dev"
```

**WARNING**: Do NOT use `lsof -ti:PORT | xargs kill` - this can kill Firefox browser processes during E2E testing!
