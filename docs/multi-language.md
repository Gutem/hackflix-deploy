# Multi-Language Audio & Subtitles

## Overview

Hackflix supports multi-language audio tracks and subtitles for video content. The implementation uses a **separate files** approach that works across all browsers.

## Content Schema

### videosByLanguage

Maps language codes to video file URLs:

```json
{
  "videosByLanguage": {
    "eng": {
      "url": "https://cdn.example.com/video-eng.mp4",
      "width": 1920,
      "height": 1080
    },
    "deu": {
      "url": "https://cdn.example.com/video-deu.mp4",
      "width": 1920,
      "height": 1080
    },
    "fra": {
      "url": "https://cdn.example.com/video-fra.mp4",
      "width": 1920,
      "height": 1080
    }
  }
}
```

### subtitlesByLanguage

Maps language codes to subtitle file URLs:

```json
{
  "subtitlesByLanguage": {
    "eng": "https://cdn.example.com/subs-eng.vtt",
    "deu": "https://cdn.example.com/subs-deu.vtt"
  }
}
```

## Browser Compatibility

### AudioTrack API Limitation

The browser's native AudioTrack API (`video.audioTracks`) **only works in Chrome and Edge**. Firefox and Safari do not support it.

### Our Solution: Separate Video Files

We use **separate video files per language** instead of embedded multi-audio tracks. This approach:

- ✅ Works in all browsers (Chrome, Edge, Firefox, Safari)
- ✅ No special API detection needed
- ✅ Simple URL switching on dropdown change

### Fallback for Embedded Multi-Audio

If content only has a single video file with embedded multi-audio:

1. Chrome/Edge: Use AudioTrack API to switch tracks
2. Firefox/Safari: Show warning, disable dropdown

```javascript
// Detection
const hasAudioTrackSupport = 'audioTracks' in HTMLVideoElement.prototype;

// Check if URLs differ per language
const urls = Object.values(content.videosByLanguage).map(v => v.url);
const hasMultipleUrls = new Set(urls).size > 1;

// Show warning only if embedded multi-audio on unsupported browser
if (!hasMultipleUrls && !hasAudioTrackSupport) {
  // Show "Audio switching requires Chrome/Edge" warning
}
```

## Video Player Implementation

### Audio Dropdown

```html
<select id="lang-select">
  <option value="eng">ENG</option>
  <option value="deu">DEU</option>
  <option value="fra">FRA</option>
</select>
<span id="audio-warning" style="display: none;">
  ⚠️ Audio switching requires Chrome/Edge
</span>
```

### Switching Logic

```javascript
langSelect.addEventListener('change', (e) => {
  const selectedLang = e.target.value;
  const videoData = content.videosByLanguage[selectedLang];
  
  // Check if URLs differ
  const urls = Object.values(content.videosByLanguage).map(v => v.url);
  const hasMultipleUrls = new Set(urls).size > 1;
  
  if (hasMultipleUrls && videoData) {
    // Switch to different video file (works everywhere)
    const source = document.getElementById('video-source');
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    source.src = videoData.url;
    video.load();
    video.currentTime = currentTime;
    if (wasPlaying) video.play();
  } else if (video.audioTracks && video.audioTracks.length > 0) {
    // Switch embedded audio track (Chrome/Edge only)
    for (const track of video.audioTracks) {
      track.enabled = track.language === selectedLang;
    }
  }
});
```

### Subtitle Dropdown

```html
<select id="sub-select">
  <option value="off">Off</option>
  <option value="eng">ENG</option>
  <option value="deu">DEU</option>
</select>
```

```javascript
subSelect.addEventListener('change', (e) => {
  const tracks = video.textTracks;
  for (const track of tracks) {
    track.mode = track.language === e.target.value ? 'showing' : 'disabled';
  }
});
```

## CORS Proxy for Subtitles

External subtitle files may lack CORS headers. We proxy them through the backend:

### Backend Endpoint

```
GET /api/subtitles?url=<encoded_url>
```

### Usage

```html
<track 
  kind="subtitles" 
  src="/api/subtitles?url=https%3A%2F%2Fcdn.example.com%2Fsubs.vtt" 
  srclang="eng" 
  label="ENG"
>
```

### Video Element Requirement

The video element must have `crossorigin="anonymous"` for subtitles to load:

```html
<video crossorigin="anonymous">
```

## Content Source Examples

### CCC (media.ccc.de)

Different congress years have different formats:

| Congress | Video Format | Audio Tracks | Subtitles |
|----------|--------------|--------------|-----------|
| 35c3 (2018) | MP4 (h264) | Separate files per language | Placeholder VTT (points to Etherpad) |
| 39c3 (2025) | WebM (av1) or MP4 | Separate files OR embedded | Real VTT subtitles |

The CCC connector handles both patterns:

```javascript
// Two-pass logic
// 1. Collect single-language recordings (preferred)
// 2. Fill missing languages from multi-language recordings

const byLang = {};
const multiLangRecordings = [];

for (const recording of recordings) {
  if (isSingleLanguage(recording.language)) {
    byLang[recording.language] = recording;
  } else {
    multiLangRecordings.push(recording);
  }
}

// Fill from multi-language if needed
for (const multi of multiLangRecordings) {
  for (const lang of multi.language.split('-')) {
    if (!byLang[lang]) {
      byLang[lang] = multi;
    }
  }
}
```

## E2E Testing

Tests are located in `tests/e2e/audio-subtitle-switching.spec.js`:

- Audio dropdown visibility
- Audio language switching
- Subtitle dropdown visibility
- Subtitle language switching
- Cross-browser compatibility (Chromium, Firefox)
- Warning message display for unsupported browsers
