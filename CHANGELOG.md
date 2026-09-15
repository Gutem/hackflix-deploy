# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### feat: home page redesign with Continue Watching, New Additions, and Topics

- Replace highlight rows (Trending, Recent, By Conference) with smarter sections
- **Continue Watching**: tracks video progress via `timeupdate` event, persists to localStorage, shows red progress bar on cards for videos under 90% complete
- **New Additions**: sorts content by `updatedAt` timestamp, shows 10 most recently ingested items
- **Topics**: keyword-based categorization into 16 topic areas (IoT & Embedded, Reverse Engineering, Exploitation, Web Security, Linux & Kernel, Windows & AD, macOS & iOS, Android & Mobile, Cryptography, AI & ML Security, Network Security, Hardware Hacking, Cloud Security, Privacy & Anonymity, Social Engineering) from title/description matching

### feat: infocon.org bulk ingest

- Rewrite InfoCon connector to dynamically discover all 232 conferences from infocon.org root directory listing (excl. CCC and DEF CON)
- Fetch ALL editions of each conference, ALL videos per edition (removed 3-edition/10-video caps)
- Incremental persistence: saves to content.json after every conference (crash-safe)
- Failure tracking: writes failed editions to `ingest-retry.log` for later retry
- Leverages existing `fetchDirectory`, `fetchConferenceEditions`, `fetchConferenceEdition` functions

### feat: per-conference content file split

- Split monolithic `content.json` (8MB+) into `data/conferences/{conf}/{year}.json` files
- Infocon conferences get top-level dirs (e.g. `44con/2024.json`, `0xcon/2024.json`) since infocon is an aggregator, not a conference
- Backend loads recursively from `data/conferences/` directory tree, fallback to `content.json` if absent
- `--migrate` CLI flag to convert existing data

### fix: XSS prevention in admin HTML

- Add `escapeHtml()` and `escapeAttribute()` functions to admin backoffice pages
- Apply escaping to all user-controlled data in tables, modals, and confirmations

### fix: security hardening

- Replace `===` string comparison in password verification with `timingSafeEqual` (timing attack prevention)
- Add URL validation with domain allowlist on proxy endpoints (shell injection prevention)
- Replace all `execSync()` calls with `spawn()` in proxy routes (no shell interpolation)
- Add input length limits on login (100 chars username, 1000 chars password) to prevent DoS

### fix: content service O(1) lookups

- Add `contentMap` to `ContentService` for O(1) content lookups by ID (was O(n) `.find()`)
- Auto-rebuilds map on construction, keeps in sync with `addContent()`

### fix: thumbnail generation for emoji/surrogate-pair characters

- Change `w[0]` to `[...w][0]` in `getThumbnailUrl` to use code-point-aware character access
- Prevents `URIError: malformed URI sequence` when titles contain emoji or CJK characters

### fix: back button consistency

- Standardize all back buttons to use `.back-btn` class (removed `.back-btn-overlay` from watch page)
- Add context-aware back URL: returns to conference detail when navigated from there, otherwise to home
- Add `.watch-content` wrapper with proper padding matching movie page layout

### fix: `this.` binding in hackflix.js

- Replace all `this.*` calls with `Hackflix.*` inside shared utility object
- Prevents `TypeError` when functions are destructured and lose `this` binding

### feat: multi-language audio and subtitle support

- Add `videosByLanguage` field to content schema for per-language video URLs
- Add `subtitlesByLanguage` field to content schema for per-language subtitle URLs
- Add audio dropdown to video player for switching between language tracks
- Add subtitle dropdown to video player for switching between subtitle languages
- Add browser detection for AudioTrack API support (Chrome/Edge only)
- Add warning message when AudioTrack API unavailable in Firefox/Safari
- Add subtitle proxy endpoint `GET /api/subtitles?url=` to bypass CORS restrictions

### fix: CCC connector video extraction

- Fix CCC connector to correctly extract separate video files per language
- Add two-pass logic in `getVideosByLanguage()`: prefer single-language recordings over multi-language
- Preserve video playback position and playing state when switching audio tracks