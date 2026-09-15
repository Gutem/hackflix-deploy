# Content Sources - Hackflix

This document describes the content sources integrated into Hackflix.

## Current Sources

### 1. CCC (Chaos Communication Congress) ✓
- **URL**: `https://api.media.ccc.de/public`
- **Content**: 100 talks (5 conferences × 20 talks each)
- **Conferences**: 35C3, 36C3, 37C3, 38C3, 39C3
- **Languages**: German, English
- **Subtitles**: Yes (VTT format)
- **Video Format**: MP4 (direct CDN URLs)
- **Status**: ✅ Fully integrated

### 2. PeerTube ✓
- **URL**: `https://peertube.lhc.net.br/api/v1`
- **Content**: 50 videos (federated from multiple instances)
- **Languages**: Portuguese (Brazilian), English, others
- **Subtitles**: Varies
- **Video Format**: HLS (m3u8 streaming playlists)
- **Status**: ✅ Fully integrated

### 3. InfoCon.org ⚠️
- **URL**: `https://infocon.org/cons/`
- **Content**: DEF CON, Black Hat, BSides, and many more
- **Languages**: English
- **Subtitles**: Multiple formats (SRT, JSON, TXT, LRC, TSV)
- **Video Format**: MP4 (direct URLs)
- **Status**: ⚠️ Connector created, but network issues during fetch
- **Note**: May need retry logic or rate limiting

## Content Summary

| Source | Count | Status | Notes |
|--------|-------|--------|-------|
| CCC | 100 | ✅ | Direct MP4 URLs, VTT subtitles |
| PeerTube | 50 | ✅ | HLS streaming, federated instances |
| InfoCon | 0 | ⚠️ | Network timeout, needs retry |
| **Total** | **150** | - | - |

## API Endpoints

All content is accessible via the backend API:

```
GET /api/playlist          # Get all accessible content
GET /api/content/:id       # Get specific video
GET /api/search?q=query    # Search content
GET /api/me                # Get user info
```

## Authentication

- **Anonymous**: 35C3 content only (20 videos)
- **Demo Key**: `7da63ffdcffb58a150211e9d063a1a57` (39C3 + 38C3 = 40 videos)
- **Premium Key**: `8fdae4d8cc6afe23d593f7956c5e991b` (all 150 videos)

## Caption Formats

### PeerTube
- HLS embedded captions

### CCC
- WebVTT (.vtt)

### InfoCon (when working)
- SubRip (.srt)
- JSON (WebVTT JSON)
- Plain text (.txt)
- LRC lyrics format (.lrc)
- TSV tab-separated (.tsv)

## Video Formats

### Native HTML5 Player Support
- MP4 (CCC, InfoCon): ✅ Direct playback
- HLS (PeerTube): ✅ Native HLS support in Safari, needs hls.js for other browsers

## Future Improvements

1. **Retry Logic**: Add exponential backoff for InfoCon fetching
2. **Rate Limiting**: Respect server rate limits
3. **Caching**: Cache video metadata locally
4. **HLS.js**: Add client-side HLS support for non-Safari browsers
5. **More Sources**:
   - YouTube (via Invidious API)
   - Internet Archive
   - Other PeerTube instances

## Testing

All connectors have unit tests:

```bash
# Test all connectors
bun test tests/unit/connectors/

# Test specific connector
bun test tests/unit/connectors/infocon.test.js
```

## Coverage

- Total tests: 169
- Coverage: ~95%
- All tests passing ✅
