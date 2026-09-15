# Hackflix

A Netflix-like streaming app built with AHA Stack (Astro + HTMX + Alpine.js) and Electrobun for desktop.

## Features

- Browse movies by category
- Search movies (fuzzy matching)
- User profiles with LocalStorage persistence
- Watchlist management
- Continue watching tracking
- YouTube trailer embeds
- PWA support (offline-capable)
- Cross-platform desktop app (macOS, Windows, Linux)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Frontend | Astro + HTMX + Alpine.js |
| Desktop | Electrobun |
| Video | YouTube embeds |
| Storage | IndexedDB / LocalStorage |
| Testing | Bun test + Playwright |

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js 18+ (for Playwright)

## Installation

```bash
# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install
```

## Development

```bash
# Start web dev server
bun run dev

# Start desktop app (requires Electrobun)
bun run dev:desktop
```

**Web server runs at:** http://localhost:4321

### Available Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Browse movies by category |
| Search | `/search` | Search movies |
| Movie Detail | `/movie/[id]` | Movie info with trailer link |
| Watch | `/watch/[id]` | YouTube embed player |
| Profile | `/profile` | Manage user profiles |

## Testing

```bash
# Run all unit tests
bun test

# Run unit tests with coverage
bun run test:coverage

# Run integration tests
bun run test:integration

# Run E2E tests (all browsers)
bun run test:e2e

# Run E2E tests (specific browser)
bun run test:e2e:chromium
bun run test:e2e:firefox
```

## Build

```bash
# Build all packages
bun run build

# Build web only
bun run build:web

# Build desktop only
bun run build:desktop
```

## Project Structure

```
hackflix/
├── packages/
│   ├── shared/           # Shared code (web + desktop)
│   │   ├── components/   # UI components
│   │   ├── lib/          # Utilities
│   │   │   ├── store.js  # IndexedDB wrapper
│   │   │   ├── movies.js # Movie data helpers
│   │   │   ├── search.js # Search functionality
│   │   │   └── youtube.js# YouTube utilities
│   │   └── styles/       # Global styles
│   │
│   ├── web/              # Astro PWA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── api/
│   │   └── public/
│   │       └── mock-data/
│   │
│   └── desktop/          # Electrobun app
│       └── src/
│           ├── bun/      # Main process
│           └── mainview/ # Webview
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start web dev server |
| `bun run dev:desktop` | Start desktop app |
| `bun run build` | Build all packages |
| `bun test` | Run unit tests |
| `bun run test:e2e` | Run E2E tests |
| `bun run lint` | Lint code (Biome) |
| `bun run format` | Format code (Biome) |

## Mock Data

The app includes 50 mock movies with:
- Hardcoded YouTube trailer IDs
- Placeholder thumbnails (picsum.photos)
- Multiple categories per movie
- Trending rankings

## Architecture

This project follows TDD (Test-Driven Development):
1. Write failing test (RED)
2. Implement minimum code to pass (GREEN)
3. Refactor if needed
4. Repeat

Test coverage target: 85%

## License

MIT
