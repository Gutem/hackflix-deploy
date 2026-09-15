# Content Sources

## Current Sources

### CCC (Chaos Communication Congress)

| Property | Value |
|----------|-------|
| API | `https://api.media.ccc.de/public` |
| Content | ~100 talks (5 conferences × 20) |
| Conferences | 35C3, 36C3, 37C3, 38C3, 39C3 |
| Languages | German, English, French, Spanish, Polish |
| Subtitles | WebVTT (.vtt) |
| Video | MP4 (h264) or WebM (av1) |
| RSS | `https://api.media.ccc.de/public/conferences/{acronym}/podcast/mp4.xml` |

**Note**: Conference list API returns events without recordings. Must fetch each event individually for full recording data.

#### Video Formats by Congress

| Congress | Video Codec | Audio Tracks | Subtitles |
|----------|-------------|--------------|-----------|
| 35c3 (2018) | MP4 (h264) | Separate files per language | Placeholder VTT (points to Etherpad) |
| 39c3 (2025) | WebM (av1) or MP4 | Separate files OR embedded | Real VTT subtitles |

#### Multi-Language Extraction

The CCC connector uses two-pass logic to extract per-language videos:

1. **First pass**: Collect single-language recordings (preferred)
2. **Second pass**: Fill missing languages from multi-language recordings

```javascript
// Single-language: { language: "eng" }
// Multi-language: { language: "eng-deu-fra" }

// Example output:
videosByLanguage: {
  eng: { url: "video-eng.mp4", ... },
  deu: { url: "video-deu.mp4", ... },
  fra: { url: "video-fra.mp4", ... }
}
```

### PeerTube

| Property | Value |
|----------|-------|
| API | `https://peertube.lhc.net.br/api/v1` |
| Content | ~50 videos (federated) |
| Languages | Portuguese (BR), English |
| Subtitles | Varies |
| Video | HLS (m3u8 streaming playlists) |
| RSS | `https://peertube.lhc.net.br/feeds/videos.xml` |

**Note**: Video list API returns items without `streamingPlaylists`. Must fetch individual video for HLS URLs.

### InfoCon (DEF CON)

| Property | Value |
|----------|-------|
| URL | `https://infocon.org/cons/` |
| Content | DEF CON 28-32 (variable) |
| Languages | English |
| Subtitles | SRT, JSON, TXT, LRC, TSV |
| Video | MP4 (direct links) |

**Note**: Uses HTML directory listing (no API). Network timeouts are common.

## Content ID Format

| Source | ID Pattern | Example |
|--------|-----------|---------|
| CCC | `ccc-{guid}` | `ccc-1a2b3c4d-...` |
| PeerTube | `peertube-{uuid}` | `peertube-77ddb2dd-5c41-...` |
| InfoCon | `defcon-{year}-{hash}` | `defcon-32-YWJjMTIz` |

## Adding New Sources

1. Create connector in `packages/shared/lib/connectors/your-source.js`
2. Implement `fetchAll(options)` returning array of content items
3. Register in `packages/ingest/src/connectors.js`
4. Add RSS feed URL in `packages/ingest/src/rss.js`
5. Run `bun run ingest --source your-source`
6. Restart backend (or trigger via admin panel)
