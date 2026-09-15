# Hackflix Design System — UI Reference

## 1. Design Tokens

### 1.1 Main App (`:root` — `packages/web/public/css/global.css`)

```css
:root {
  /* ── Surface ── */
  --color-bg-primary: #141414;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #2a2a2a;
  --color-bg-card: #222222;
  --color-bg-card-hover: #252525;
  --color-bg-hero-start: #1a1a2e;
  --color-bg-hero-mid: #16213e;
  --color-bg-hero-end: #0f3460;

  /* ── Text ── */
  --color-text-primary: #ffffff;
  --color-text-secondary: #b3b3b3;
  --color-text-muted: #808080;

  /* ── Accent ── */
  --color-accent: #e50914;
  --color-accent-hover: #f40612;
  --color-accent-dark: #b20710;

  /* ── Tier / Semantic ── */
  --color-tier-admin: #e87c2c;
  --color-tier-premium: #b81d24;
  --color-tier-basic: #6d6d6e;

  /* ── Borders & Overlay ── */
  --color-border: #333333;
  --color-overlay: rgba(0, 0, 0, 0.7);

  /* ── Typography ── */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Type scale ── */
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.85rem;      /* 13.6px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.1rem;       /* 17.6px */
  --font-size-h4: 1rem;         /* 16px */
  --font-size-h3: 1.25rem;      /* 20px */
  --font-size-h2: 1.5rem;       /* 24px */
  --font-size-h1: 2rem;         /* 32px */
  --font-size-hero: 2.5rem;     /* 40px */

  /* ── Spacing (8-step scale) ── */
  --space-xs: 0.25rem;          /* 4px */
  --space-sm: 0.5rem;           /* 8px */
  --space-md: 0.75rem;          /* 12px */
  --space-lg: 1rem;             /* 16px */
  --space-xl: 1.5rem;           /* 24px */
  --space-2xl: 2rem;            /* 32px */
  --space-3xl: 3rem;            /* 48px */

  /* ── Radii ── */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;

  /* ── Motion ── */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;

  /* ── Z-index ── */
  --z-header: 100;
  --z-overlay: 150;
  --z-modal: 200;

  /* ── Layout ── */
  --content-padding-x: 3rem;
  --header-height: 80px;
  --back-btn-mb: 1rem;
}
```

### 1.2 Admin (`:root` — `packages/backoffice/src/routes/admin-pages.js` line 59)

```css
:root {
  --bg-primary: #141414;         /* same */
  --bg-card: #1a1a2e;            /* navy tint */
  --bg-input: #141414;           /* same as bg */
  --bg-code: #0d1117;            /* GitHub dark */

  --text-primary: #fff;
  --text-secondary: #c8c8c8;     /* lighter than #b3b3b3 */
  --text-tertiary: #a0a0a0;
  --text-muted: #707070;         /* darker than #808080 */

  --accent: #e50914;
  --success: #46d369;
  --warning: #e87c2c;

  --border: #333;
  --border-input: #555;

  --radius-sm: 4px;
  --radius-md: 8px;

  --font-mono: 'SF Mono','Cascadia Code',Monaco,'Consolas',monospace;
  --font-sans: -apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;

  /* Space scale identical to main app */
}
```

---

## 2. Color Palette

### 2.1 Dark Theme Layering

| Layer | Hex | Usage |
|-------|-----|-------|
| Layer 0 (body) | `#141414` | Deepest background |
| Layer 1 (cards) | `#1a1a1a` / `#1a1a2e` | Elevated surface |
| Layer 2 (inputs) | `#2a2a2a` / `#141414` | Form backgrounds |
| Layer 3 (hover) | `#252525` | Card hover state |

### 2.2 Brand

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | `#e50914` | CTAs, focus, logo, active nav |
| `--color-accent-hover` | `#f40612` | Reserved |
| `--color-accent-dark` | `#b20710` | Gradient stops |

### 2.3 Tier Colors

| Tier | Hex | Text |
|------|-----|------|
| Admin | `#e87c2c` | `#000` |
| Premium | `#b81d24` | `#fff` |
| Basic | `#6d6d6e` | `#fff` |

### 2.4 Source Badges (Admin)

| Source | Hex |
|--------|-----|
| CCC | `#1a6b3c` |
| PeerTube | `#b85b14` |
| InfoCon | `#1a3a6b` |
| YouTube | `#b31b1b` |

### 2.5 60-30-10 Rule

| Role | % | Tokens |
|------|---|--------|
| Dominant (60%) | Backgrounds | `--color-bg-primary`, `--color-bg-secondary` |
| Secondary (30%) | Cards, inputs | `--color-bg-tertiary`, `--color-border` |
| Accent (10%) | CTAs, badges | `--color-accent`, tier badges |

---

## 3. Typography

| Token | Size | Usage |
|-------|------|-------|
| `--font-size-xs` | 12px | Badges, count labels |
| `--font-size-sm` | 13.6px | Tags, secondary text |
| `--font-size-base` | 16px | Body, buttons |
| `--font-size-lg` | 17.6px | Speakers, featured p |
| `--font-size-h3` | 20px | Card titles |
| `--font-size-h2` | 24px | Section headings |
| `--font-size-h1` | 32px | Page titles |
| `--font-size-hero` | 40px | Hero headings |

| Context | Line Height |
|---------|------------|
| Body | `1.5` |
| Headings | `1.2` |
| `.description` | `1.7` |

| Role | Weight |
|------|--------|
| Body | 400 |
| h1-h4, .btn | 600 |
| .site-logo, .featured-info h1 | 700 |
| .stat-value (admin) | 800 |

---

## 4. Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Button gaps, badge padding |
| `--space-md` | 12px | Carousel gap, button padding |
| `--space-lg` | 16px | Card grid gap, base padding |
| `--space-xl` | 24px | Stat card padding, stats-grid gap |
| `--space-2xl` | 32px | Hero margin, section separation |
| `--space-3xl` | 48px | Admin main padding, error states |

`--content-padding-x: 3rem` (48px) — layout constant, separate from spacing scale.

---

## 5. Components

### 5.1 Buttons

```css
.btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1.5rem; border-radius: 4px;
  font-weight: 600; font-size: 1rem; border: none; cursor: pointer;
  transition: background var(--transition-fast), opacity var(--transition-fast), transform 0.1s;
}
.btn:hover { opacity: 0.9; }
.btn:active { transform: scale(0.97); }
```

| Variant | Background | Color |
|---------|-----------|-------|
| `.btn-primary` | `var(--color-text-primary)` | `var(--color-bg-primary)` |
| `.btn-accent` | `var(--color-accent)` | `var(--color-text-primary)` |
| `.btn-secondary` | `rgba(109,109,110,0.7)` | `var(--color-text-primary)` |

Admin adds: `.btn-danger`, `.btn-success`, `.btn-sm`, `.btn-icon`, and `.btn.loading` (spinner).

### 5.2 Cards

**`.movie-card`** — 360px wide, 16:9 thumbnail, hover scale(1.05) + overlay fade.

**`.conf-card`** — Flex row, 64px logo/icon, name+description+count, min-height 178px, hover lift.

**`.stat-card`** (admin) — Background `#1a1a2e`, 1.75rem value, 0.9rem label, hover lift 2px.

### 5.3 Layout

| Class | Purpose |
|-------|---------|
| `.site-header` | Fixed top nav, gradient bg |
| `.main` | Page wrapper, padding-top: 80px |
| `.main-detail` | Detail pages, no bottom padding |
| `.carousel-row` | Horizontal scroll strip |
| `.conf-grid` | `repeat(auto-fill, minmax(320px, 1fr))`, gap 0.75rem |
| `.card-grid` | Same columns, gap var(--space-lg) |
| `.featured-hero` | 85vh hero with gradient |
| `.conf-hero` | Conference detail header |
| `.letter-nav` | Sticky A-Z bar |
| `.video-container` | 16:9 max-1200px player |

### 5.4 Badges

**Main app:**
```css
.tier-admin   { background: var(--color-tier-admin);    color: #000; }
.tier-premium { background: var(--color-tier-premium);  color: #fff; }
.tier-basic   { background: var(--color-tier-basic);    color: #fff; }
```

**Admin:**
```css
.bt-active  { background: var(--success); color: #000; }
.bt-blocked { background: var(--accent);  color: #fff; }
.bt-ccc     { background: #1a6b3c; color: #fff; }
.bt-youtube { background: #b31b1b; color: #fff; }
/* etc */
```

### 5.5 Profile

```css
.profile-hero   { text-align: center; }
.profile-avatar { 80px circle, accent bg, initials }
.profile-card   { max-width: 800px; margin: 0 auto; }
.profile-section { padding + bottom border; last-child no border }
.pf-row         { flex: space-between }
```

### 5.6 Admin Components

- **`.modal`** — fadeIn + slideUp, Escape key, backdrop blur
- **`.toast`** — slideIn/slideOut, success (green) / error (red)
- **`.table-wrap`** — horizontal scroll wrapper
- **`.key-reveal`** — monospace + Copy button
- **`.key-preview`** — truncated monospace in table

---

## 6. Responsive

### Admin: 768px

Header compresses, nav shrinks, user-info hidden, main padding reduces, stats grid minimum 150px, modal 95% width, ingest vertical layout, toasts full-width.

### Admin: 480px

Logo shrinks, stats single column, buttons compact, actions stack vertically.

### Main App

No explicit breakpoints — fluid via `auto-fill` grids, `flex-wrap`, `max-width`.

---

## 7. Animation

| Component | Property | Duration |
|-----------|----------|----------|
| `.btn:hover` | background, opacity | 150ms |
| `.btn:active` | transform | 100ms |
| `.movie-card:hover` | transform | 300ms |
| `.movie-card-overlay` | opacity | 300ms |
| `.conf-card:hover` | background, transform, border | 150ms |
| `.search-input:focus` | border, box-shadow | 150ms |
| `.stat-card:hover` (admin) | transform, box-shadow | 150ms |

Keyframes: `spin` (loading), `fadeIn` (modal), `slideUp` (modal), `slideIn`/`slideOut` (toasts).

`@media (prefers-reduced-motion: reduce)` disables all animations.

---

## 8. Token Divergence (Main vs Admin)

| Token | Main | Admin | Reason |
|-------|------|-------|--------|
| `bg-card` | `#222222` | `#1a1a2e` | Visual distinction |
| `text-secondary` | `#b3b3b3` | `#c8c8c8` | Higher contrast on navy |
| `font-family` | Inter | System | No webfont dependency |
| `--success` | none | `#46d369` | Admin-only |
| `--border-input` | none | `#555` | Admin-only |
