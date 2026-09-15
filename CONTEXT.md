# Hackflix Context

## Goal
Netflix-like streaming app with dumb client + backend API for AuthN/AuthZ

## Architecture
```
┌─────────────┐     API Key      ┌─────────────┐
│   Client    │ ──────────────── │   Backend   │
│  (Browser)  │    (optional)    │   (Bun)     │
└─────────────┘                  └─────────────┘
      │                                 │
   LocalStorage                   media.ccc.de
```

## Tech Stack
- **Runtime**: Bun
- **Frontend**: Astro (server mode) + vanilla JS
- **Backend**: Bun server (native fetch)
- **AuthN**: Login page (API key or guest access)
- **AuthZ**: Content access based on API key permissions
- **Test**: Bun test (145 passing)

## Progress

### Done
- [x] Monorepo setup (packages/shared, packages/web, packages/backend)
- [x] Shared libraries with TDD (145 unit tests)
- [x] Backend API server with AuthN/AuthZ:
  - API key generation/validation
  - Anonymous users (guest access)
  - Content authorization by user tier
  - CORS support
  - Loads content from media.ccc.de on startup
- [x] API endpoints:
  - `GET /api/playlist` - User's authorized content
  - `GET /api/content/:id` - Single content item
  - `GET /api/search?q=` - Search content
  - `GET /api/me` - Current user info
- [x] Frontend pages:
  - Login: API key input or continue as guest
  - Home: Fetches playlist from backend, groups by conference
  - Movie detail: Fetches content from backend
  - Watch: Native video player with fetched video URL
  - Profile: User info, logout option
- [x] User tiers:
  - `anonymous`: Guest access (35C3 only)
  - `basic`: Limited content (specific conferences)
  - `premium`: All content (`["*"]`)

### In Progress
- [ ] E2E tests with Playwright

### Next
- [ ] Desktop wrapper with Electrobun
- [ ] PWA support
- [ ] Search page integration with backend

## Running the App
```bash
# Start backend (loads content from media.ccc.de)
cd packages/backend && bun run src/server.js
# Prints Demo API Key and Premium Key

# Start frontend
cd packages/web && bun run dev

# Run tests
bun test
```

## Key Files
- `packages/backend/src/server.js` - Main server, loads CCC content
- `packages/backend/src/middleware/auth.js` - AuthN/AuthZ middleware
- `packages/backend/src/services/content.js` - Content + ACL
- `packages/web/src/pages/login.astro` - Login page (AuthN)
- `packages/web/src/pages/index.astro` - Home page (fetches playlist)
- `packages/web/src/pages/movie/[id].astro` - Movie detail (fetches content)
- `packages/web/src/pages/watch/[id].astro` - Video player
- `packages/web/src/pages/profile.astro` - User info, logout

## Auth Flow (AuthN + AuthZ)
1. **Login Page** (`/login`) - AuthN
   - User enters API key OR continues as guest
   - API key stored in localStorage
2. **Dashboard** (`/`) - AuthZ
   - Anonymous (guest): 35C3 content only
   - Authenticated with key: Content based on key permissions
   - API requests include `X-API-Key` header (optional)
3. **Backend AuthZ**:
   - No key → Anonymous user (limited content)
   - Valid key → User with custom permissions
   - User's `contentIds` determines accessible content

## Content Sources
- media.ccc.de (CCC congress recordings)
  - Multi-language audio/video
  - VTT subtitles
  - Multiple video qualities (HD/SD)
