# Design System — UX (Hackflix)

> **Visual tokens** and component styles live in `global.css`.
> This document describes **behavior**: how components respond to user action, how
> pages connect, and how the system enforces access, handles errors, and adapts
> across viewports.

---

## 1. Navigation Model

### 1.1 HTMX Boosted SPA

Every page except `/login` and `/admin` declares:

```html
<body hx-boost="true" hx-target="#main" hx-select="#main" hx-swap="outerHTML">
```

This turns all same-origin `<a>` clicks into AJAX requests that swap only the
`<main id="main">` element.

| Rule | Behavior |
|:--|:--|
| **Full-page loads** | The `/login` and `/admin` pages link to each other with normal navigation (no `hx-boost`). They are separate SPAs. |
| **Active media teardown** | Before every `htmx:beforeSwap`, all `<video>` and `<audio>` elements are paused, unloaded (`removeAttribute("src")` + `load()`), preventing lingering audio. |
| **Nav sync** | After every `htmx:afterSettle`, the `.site-nav a` active class is recalculated from `window.location.pathname`. |
| **Scroll position** | HTMX replaces `<main>` content in place. The browser retains the scroll position of the fixed header unless a new page explicitly sets it. |

### 1.2 Back Navigation (Watch Page)

The watch page (`/watch/?id=...`) detects the referrer to build a meaningful
back link:

1. Parse `document.referrer`. If it shares the same origin, examine its path.
2. If the user came from `/conference/?slug=X`, the back link goes to that
   specific conference with a label showing the conference name.
3. If from `/conferences/` or `/documentaries/`, the back link goes to the
   listing with that label.
4. **Fallback**: if the referrer is external or absent, the back link goes to
   `/` labeled "Voltar".

This is done entirely client-side in `watch.html` — the back link is injected
**before the `<video>` element** as `.back-btn`.

### 1.3 Page Transition States

Every page that loads data asynchronously starts with:

```html
<div id="content-area" class="loading">Carregando...</div>
```

This CSS class centers the text at 80vh height with muted color. Once data
arrives, `classList.remove("loading")` reveals the content.

---

## 2. Information Architecture

```
Login
  │
  ▼
Index (hero + carousels)
  │
  ├── Conferences (A-Z grid)
  │     └── Conference Detail (year sections + card grid)
  │           └── Watch (video player + metadata)
  │
  ├── Documentaries (card grid)
  │     └── Documentary Detail (episodes by year)
  │           └── Watch
  │
  ├── Topics (tag list)
  │     └── Topic Detail (filtered by tag)
  │           └── Watch
  │
  ├── Search (debounced input → results)
  │     └── Watch
  │
  └── Profile (user info + API key management)
```

### 2.1 Content Hierarchy per Page

| Page | Primary element | Secondary | Notes |
|:--|:--|:--|:--|
| Index | `.featured-hero` (random item) | Carousels: Continue Watching, New, 6 topic carousels, All Talks | `hx-boost` navigates cards to `/watch/` |
| Conferences | `.letter-nav` sticky bar | A-Z grouped `.letter-section` blocks | Each section anchored with `#letter-X` |
| Conference Detail | `conf-hero` with logo/description | Year-grouped `.card-grid` sections | Back button at top |
| Watch | `.video-container` (16:9) | `.info` block (title, meta, speakers, description, tags) | `.back-btn` injected above video |
| Search | `.search-input` (autofocus) | `.card-grid` results | 300ms debounce, serverside `/api/search?q=` |
| Topics | tag list sorted by count | When `?q=` present: filtered `.card-grid` | `.back-btn` to topic list |
| Profile | `.profile-avatar` + tier badge | Account, API Key, Logout sections | Full page load, no HTMX navigation |

### 2.2 Site Header

The **fixed header** is present on every page except `/login`. It contains:

- **Logo**: links to `/` — always the primary escape hatch.
- **Nav links**: Início, Conferências, Documentários, Tópicos, Buscar, Perfil.
- **Active state**: CSS class `.active` applied via `syncActiveNav()` on
  `DOMContentLoaded` and `htmx:afterSettle`. The logic uses prefix matching
  (`/conference/` matches `/conferences/` nav item).
- **No hamburger menu** — the nav uses horizontal overflow with `flex-wrap`
  at narrow widths.

---

## 3. Interaction Patterns

### 3.1 Card Hover

| Component | Hover behavior |
|:--|:--|
| `.movie-card` | Scale to 1.05×, overlay fades in from transparent to visible. Overlay shows title + metadata (duration • year • conference). |
| `.conf-card` | Background shifts to `--color-bg-card-hover`, border appears, 1px translateY lift. |
| `.conf-list-item` | Subtle background at 3% white opacity. |
| `.result-card` | Background at 5% white opacity. |
| `.view-all-link` | Background darkens, accent border appears. |
| `.tag` | Background darkens. |

### 3.2 Carousel Scroll

- `.carousel-content` is a horizontal flex container with `overflow-x: auto`.
- Scrollbar is hidden (`scrollbar-width: none` / `::-webkit-scrollbar`).
- Each carousel shows **7 cards maximum** (`.slice(0, 7)`), followed by a
  `.view-all-link` "Ver mais ›" card at the end.
- On the index page, carousels are:
  1. **Continue Watching** (if localStorage has progress data)
  2. **New Additions** (most recently updated, 10 items)
  3. **6 topic carousels** (top tags by count, each with up to 10 matching items)
  4. **All Talks** (remaining un-featured items, 20 items)
- On topic pages (`?q=X`), the carousel switches to `flex-wrap:wrap` with
  `overflow-x:visible` — effectively a grid disguised as a carousel.

### 3.3 Letter Navigation (Conferences)

- `.letter-nav` is **sticky** at `top: 80px` (header height).
- Rendered from the first character of each conference name. Non-alpha
  characters group under `#`.
- Each letter links to `#letter-A`, `#letter-B`, etc.
- Target sections use `scroll-margin-top: 110px` so the sticky nav doesn't
  obscure the heading.
- **Edge case**: `#` is always sorted to the end regardless of ASCII order.

### 3.4 Modal Dialogs (Admin SPA)

The admin SPA has its own modal system:

| Action | Trigger | Result |
|:--|:--|:--|
| **Open** | `modal(html)` — renders into `#modal-root` | Overlay + modal slide up, `keydown` listener for Escape |
| **Close** | `closeModal()` or click overlay background or Escape | Clears `#modal-root`, removes keyboard listener |
| **Overlay click** | Click on `.modal-overlay` (not `.modal`) | Closes modal |
| **Animation** | `.modal-overlay` fades in (150ms), `.modal` slides up (200ms) | — |

Modals are used for: Create User, Edit User, Delete User, Block User, Reset
Password, Regenerate Key, Edit Content, Delete Content.

### 3.5 Form Submissions

| Context | Pattern | Validation |
|:--|:--|:--|
| **Login** | `POST /api/auth/login` with credentials. On success: store user in localStorage, redirect to `/`. | Client-side: non-empty check. Server-side: returns `{ error }` on failure. |
| **Admin login** | Same endpoint, but also checks `data.user.tier === "admin"`. On success: store token + user in localStorage, redirect to `/admin`. | Tier gate enforced client AND server side. |
| **Admin CRUD** | All admin mutations use `api()` wrapper which auto-attaches `Authorization: Bearer` header from localStorage. | `api()` returns `null` on 401/403, clears localStorage, and redirects to `/admin`. |
| **Button loading** | `btnLoading(el, true)` adds `.loading` class, disables button, shows inline spinner via `::after` pseudo-element. | — |

### 3.6 Video Player Init

1. Fetch content by ID from `/api/content/:id`.
2. **YouTube**: extract video ID from URL, inject an `<iframe>` with
   `youtube-nocookie.com` and `autoplay=1`.
3. **HLS** (`.m3u8`): use Hls.js to attach the stream.
4. **Direct video**: set `video.src` directly.
5. **Subtitles**: iterate `content.subtitlesByLanguage`, render `<track>` elements
   pointed at `/api/subtitles?url=...` with `crossorigin="use-credentials"`.
6. **Watch progress**: `timeupdate` event fires every 5s, saves to
   `localStorage["hackflix_watch_progress"]` with a 50-entry LRU cap.
7. **Proxy**: sources `defcon`, `infocon`, `archive.org`, `ccc` route through
   `/api/proxy/video?url=`.

### 3.7 Continue Watching

- **Data source**: `localStorage["hackflix_watch_progress"]`.
- **Filter**: only items where `currentTime > 5` seconds AND
  `currentTime < duration * 0.9` (not started, not finished).
- **Sort**: most recent first, capped at 10 items.
- **Rendering**: cards with a red progress bar `.mc-progress-bar` at the bottom
  showing percentage.

---

## 4. Authentication Flow

### 4.1 Login Gate

- `/login` is the **only unauthenticated page**. It does NOT use `hx-boost` and
  does NOT load `hackflix.js` (which would auto-redirect to `/login` in an
  infinite loop).
- On page load, `/login` checks for existing `localStorage["hackflix_user"]`.
  If found, redirects to `/` immediately.
- Successful login: `POST /api/auth/login` returns a JWT via HttpOnly cookie
  AND `{ user, token }` in the response body. The user object is stored in
  localStorage for UI rendering (username, tier, avatar initials).

### 4.2 Auth Verification (Every Page)

Every data-fetching page calls `H.authenticate()` before making any API calls:

```
authenticate()
  → fetch /api/auth/verify (credentials: "include")
  → if 200: cache user in localStorage, return user
  → if failure: clear localStorage, redirect to /login, throw AUTH_REQUIRED
```

The cache (`H._authPromise`) prevents duplicate verification requests within
the same page load. All subsequent API calls use `credentials: "include"` to
send the HttpOnly cookie.

### 4.3 401 Interception

Two layers of protection:

1. **API response handler**: `H.redirectIfUnauthorized(res)` checks
   `res.status === 401` and redirects to `/login`.
2. **Inline checks**: each page's `load()` function explicitly checks
   `res.status === 401` after every fetch and redirects.

### 4.4 Logout

- `POST /api/auth/logout` (credentials: include).
- Clear `localStorage["hackflix_user"]`.
- Redirect to `/login`.

### 4.5 Admin Auth

The admin SPA at `/admin` (port 3001) uses a separate auth flow:

- **Server-side gate**: `renderAdminApp()` is only called if the server
  middleware verifies the token first. Otherwise `renderAdminLogin()` is
  returned.
- **Client-side token**: stored in `localStorage["hackflix_token"]`, sent as
  `Authorization: Bearer` header on every `api()` call.
- **Logout**: clears localStorage AND the cookie (`hackflix_token=; max-age=0`).
- **401/403**: `api()` returns `null`, auto-clears localStorage, redirects to
  `/admin`.

---

## 5. Error & Empty States

### 5.1 State Taxonomy

Every data-loading area supports three states:

| State | CSS class | Content | Trigger |
|:--|:--|:--|:--|
| **Loading** | `.loading` | Centered "Carregando…" / "Loading…" | Page init, before fetch completes |
| **Empty** | `.empty` | Heading + description + optional CTA | API returns 0 items |
| **Error** | `.error-state` | "Falha ao carregar" / "Failed to load" | Network error or non-401 server error |

### 5.2 Empty State Variants per Page

| Page | Empty message | CTA |
|:--|:--|:--|
| Index | "Sem conteúdo. Execute o pipeline de ingestão para popular o conteúdo." | None |
| Conferences | "Nenhuma conferência" | None |
| Conference Detail | "Nenhuma palestra encontrada" | "← Voltar às Conferências" |
| Documentaries | "Nenhum documentário" | None |
| Documentary Detail | "Nenhum episódio encontrado" | "← Voltar" |
| Search | "Nenhum resultado. Tente palavras-chave diferentes" | None |
| Topic | "Nenhuma palestra para este tópico" | None (already at topic list) |
| Watch (no ID) | "Sem conteúdo specified" | "← Voltar ao Início" |
| Watch (null content) | "Conteúdo indisponível / This content may require a premium subscription" | "← Voltar ao Início" |
| Watch (no video URL) | "Vídeo indisponível" + external link if `frontendUrl` exists | External link button |

### 5.3 Admin Error States

| State | Message | Action |
|:--|:--|:--|
| Connection lost | "Conexão perdida. Servidor na porta X" | "Tentar novamente" button (reloads) |
| Empty users table | "No users yet. Click **+ Create User** to add one." | Create button inline |
| Empty content table | "No content found. Run an ingest first." | Contextual hint |
| Empty source dropdown | Option "All Sources" only | — |
| Toast error | Red left-border, slides in from right, auto-removes after 3.5s | — |

### 5.4 Search Input States

| Input length | Behavior |
|:--|:--|
| `< 2 chars` | Results area cleared (no request made) |
| `>= 2 chars` | 300ms debounce, then `GET /api/search?q=` |
| Network error | "Falha na busca" |
| 0 results | "Nenhum resultado" with hint text |

---

## 6. Content Filtering & Access Control

### 6.1 User Tiers

| Tier | Access level | Badge color |
|:--|:--|:--|
| **admin** | All content, admin dashboard | Orange (`--color-tier-admin`) |
| **premium** | All content (no restrictions) | Red (`--color-tier-premium`) |
| **basic** | Limited to assigned `contentIds` | Gray (`--color-tier-basic`) |

### 6.2 Content Access Model

Each user has a `contentAccess` field:

- `"all"` — admin and premium users see everything.
- `["39c3", "38c3", ...]` — basic users see only content matching those IDs.
  The server filters results at the API level; the client does not do additional
  filtering.

### 6.3 Profile Display

The profile page shows:
- **Plano** (tier with colored badge)
- **Acesso** — displayed as "Tudo" for `"all"`, or `"3 conferências"` for arrays.

### 6.4 Admin Content Management

- **Content IDs** field: comma-separated IDs or `*` for all. Parsed by
  `contentIds.split(',').map(s => s.trim()).filter(Boolean)`.
- **Tier dropdown**: Basic, Premium, Admin. Affects what the user can see.

---

## 7. Responsive Behavior

### 7.1 Breakpoints (Main App)

The main app uses CSS Grid with `auto-fill` and `minmax()` — it does NOT use
explicit breakpoints:

| Component | Layout strategy |
|:--|:--|
| `.card-grid` | `repeat(auto-fill, minmax(320px, 1fr))` — cards shrink until 320px, then reflow |
| `.conf-grid` | Same as above |
| `.movie-card` | Fixed width 360px in carousels, `width: 100%` inside `.card-grid` |
| `.site-header` | Fixed positioning, no changes at mobile |
| `.site-nav` | Horizontal `flex` with `gap: 1.5rem`, overflows naturally |
| `.featured-hero` | `min-height: 85vh`, `max-width: 600px` on the info block |
| `.video-container` | `max-width: 1200px`, `aspect-ratio: 16/9` — respects viewport width |

### 7.2 Breakpoints (Admin SPA)

Two explicit breakpoints defined in `admin-pages.js`:

| Breakpoint | Changes |
|:--|:--|
| **≤768px** | Header padding reduces, nav gap shrinks, `user-info` hidden, main padding decreases, stats grid uses `minmax(150px, 1fr)`, modals go to 95% width, toast container spans full bottom width |
| **≤480px** | Logo shrinks, stats grid becomes single column, buttons reduce padding, action groups stack vertically |

### 7.3 Video Responsiveness

- `.video-container` uses `aspect-ratio: 16/9` with `max-width: 1200px`.
- Video element inside uses `object-fit: contain` — letterboxing, never cropping.
- YouTube embeds use the padding-top 56.25% technique for 16:9.

---

## 8. Keyboard Accessibility

### 8.1 Focus Management

- **Global focus-visible**: `:focus-visible` shows a 3px red outline with 2px
  offset. `:focus:not(:focus-visible)` hides the outline (prevents visual
  clutter on mouse clicks).
- **Search autofocus**: the search input on `/search/` gets `autofocus` on load.
- **Modal focus**: modals in admin SPA trap focus implicitly via the overlay
  listener; no explicit focus trap is implemented.

### 8.2 Tab Order (Main App)

Natural DOM order provides correct tab flow:

```
Logo → Nav (6 links) → Page content (cards, buttons, inputs)
```

Within carousels, all 7+ cards are focusable in DOM order. Within grids, the
natural 2D grid layout produces left-to-right, top-to-bottom tab order.

### 8.3 Spatial Navigation (D-pad / Arrow Keys)

The app registers `H.initSpatialNav()` which enables **directional navigation**
for Smart TV / gamepad users:

- Listens for `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` on all
  focusable elements (`a, button, input, select, textarea, [role='button']`).
- Calculates the nearest element in the pressed direction using Euclidean
  distance with an orthogonal penalty.
- Scrolls the focused element into view smoothly.
- `Enter` and `Space` on focused elements trigger `click()`.
- Elements are cached and re-queried on scroll, resize, and visibility changes.
- **Auto-focus**: after 500ms, if nothing is focused, sets `tabindex="0"` on
  the first focusable element.

### 8.4 Modal Keyboard Support (Admin)

- **Open**: no auto-focus on modal content.
- **Close**: `Escape` key removes the modal via `onModalKey()`.
- **Overlay click**: clicking the backdrop (not the modal body) closes.

### 8.5 Skip Links

No explicit skip-to-content link exists. The first focusable element is the
logo link.

### 8.6 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

This disables: card hover scale, overlay fade-in, modal animations, toast
slide-in, and the `.btn:active { transform: scale(0.97) }` press effect.

---

## 9. Admin Workflows

### 9.1 Dashboard (Default Tab)

**What loads**: 3 API calls in parallel (`Promise.all`):
- `GET /api/auth/verify` — user identity
- `GET /api/admin/ingest/status` — connector stats + last run
- `GET /api/admin/content` — total content count

**Stats grid**: Total Content, Connectors, Source Breakdown (bar chart per
source), Last Ingest timestamp.

**Quick Actions**: links to Users, Content, Ingest tabs.

**Connection failure**: shows "Conexão perdida" with server port and a "Tentar
novamente" reload button.

### 9.2 Create User → API Key Reveal

```
1. Click "+ Create User"
2. Modal opens: Username*, Email*, Password*, Tier, Content IDs
3. POST /api/admin/users → returns { apiKey }
4. Original modal closes
5. NEW modal opens: "User Created — Copy this API key now, shown only once"
   - Key displayed in a green-bordered code box with Copy button
   - Copy uses navigator.clipboard.writeText()
   - Button text changes "Copy" → "Copied!" (2s) → "Copy"
6. Toast: "User created successfully" (bottom-right, green left-border)
7. Users table re-renders
```

### 9.3 Edit User → Persist

```
1. Click "Edit" on a user row
2. Modal opens pre-populated with current values
3. Password field: placeholder says "(leave blank to keep)"
4. PATCH /api/admin/users/:id with changed fields
5. Close modal, toast success/error, re-render table
```

### 9.4 Destructive Actions (Confirm → Execute)

All destructive actions follow a two-step pattern:

| Action | Confirm modal text | Endpoint |
|:--|:--|:--|
| Delete User | "Permanently delete X? This cannot be undone." | `DELETE /api/admin/users/:id` |
| Block User | "This user will lose access immediately. Continue?" | `PATCH /api/admin/users/:id/status { status: "blocked" }` |
| Delete Content | "Delete X? This cannot be undone." | `DELETE /api/admin/content/:id` |
| Reset Key | "The old key will stop working immediately. Continue?" | `POST /api/admin/users/:id/reset-key` |
| Reset Password | "A new random password will be generated. Continue?" | `POST /api/admin/users/:id/reset-password` |

The confirm button is styled `btn-danger` for deletions, `btn-primary` for
others. The primary action always loads after confirming.

### 9.5 Ingest → Results

**Two ingest paths:**

**A. YouTube Playlist:**
```
1. Enter playlist ID or URL
2. POST /api/admin/ingest/youtube { playlistId }
3. Results rendered as a list: per-source stats
   - Green left-border: "+X added, Y dupes, Z updated (total: T)"
   - Red left-border: "Error: <message>"
4. Toast: "YouTube ingest complete"
```

**B. Full Ingest:**
```
1. Select source (All / CCC / PeerTube / InfoCon / YouTube)
2. Optionally check "Upsert"
3. POST /api/admin/ingest/run { source?, upsert? }
4. Results rendered same as YouTube path
5. Toast: "Ingest complete"
```

**Failures**: if `api()` returns null (server down), the page shows the
connection-lost error state with reload button.

### 9.6 Content Browsing

- **Source filter**: dropdown populated from `/api/admin/content/sources`.
  Selecting a source filters the in-memory items array client-side.
- **Table**: shows Title (truncated with ellipsis), Source (colored badge),
  Conference, Year, Duration, Actions (Edit, Delete).
- **Pagination**: first 100 items shown. If `items.length > 100`, a note
  appears: "Showing 100 of X".

### 9.7 Navigation Between Admin Tabs

The admin is a single-page SPA. Clicking nav links:
1. Updates `window.location.hash` or path (handled by the router in `admin-app.js`)
2. The `PAGE` dataset attribute determines which render function to call:
   `pages = { "/": renderDashboard, "/users": renderUsers, "/content": renderContent, "/ingest": renderIngest }`
3. The active nav item gets `.active` class + red underline via `::after`.

---

## Appendix: User Flow Diagrams

### A1. Main Browsing Flow

```
/ → authenticate() → fetch /api/content
  → Featured Hero (random)
  → Continue Watching (localStorage)
  → Carousel: New Additions (10 recent)
  → Carousel: Top Tag 1 (10 items)
  → Carousel: Top Tag 2 (10 items)
  → ...up to 6 tags...
  → Carousel: All Talks (20 items)
```

### A2. Conference Browsing Flow

```
/conferences/ → authenticate() → fetch /api/conferences
  → filter type !== "documentary"
  → A-Z groupBy
  → render letter-nav (sticky)
  → render sections (with #letter-X anchors)
  → click conf-card → /conference/?slug=X
    → authenticate() → fetch /api/conference/:slug
    → groupBy year (descending)
    → render year sections with card grids
      → click movie-card → /watch/?id=X
        → referrer-based back link
        → authenticate() → fetch /api/content/:id
        → initVideo (HLS or direct or YouTube iframe)
        → trackWatchProgress every 5s
```

### A3. Search Flow

```
/search/ → input autofocus
  → 300ms debounce on input
  → if >= 2 chars: authenticate() → GET /api/search?q=
  → render card-grid results
  → click card → /watch/?id=X
```

### A4. Login → Main Flow

```
/login → check localStorage for existing user
  → if found → redirect /
  → if not → show login form
    → submit → POST /api/auth/login (credentials: include)
      → success → localStorage.setItem("hackflix_user", data.user)
      → redirect /
        → DOMContentLoaded → setTimeout(authenticate, 0)
        → load() → fetch /api/content → render home
```
