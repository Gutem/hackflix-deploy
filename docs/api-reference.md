# API Reference

Base URL: `http://localhost:3001`

## Authentication

All endpoints accept an API key via:
- `X-API-Key` header
- `Authorization: Bearer <key>` header
- `?api_key=<key>` query parameter

Missing/invalid key → anonymous access (limited content).

---

## Public Endpoints

### `GET /api/playlist`

Get user's authorized content.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `source` | string | Filter by source (ccc, peertube, infocon) |
| `conference` | string | Filter by conference name |
| `limit` | number | Pagination limit |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "items": [{ "id": "...", "title": "...", ... }],
  "total": 150,
  "limit": null,
  "offset": null
}
```

### `GET /api/content/:id`

Get single content item by ID.

**Response:**
```json
{
  "id": "ccc-abc123",
  "title": "Talk Title",
  "videoUrl": "https://...",
  "videosByLanguage": {
    "eng": { "url": "https://...", "width": 1920, "height": 1080 },
    "deu": { "url": "https://...", "width": 1920, "height": 1080 }
  },
  "subtitlesByLanguage": {
    "eng": "https://..."
  }
}
```

**Errors:**
- `404` - Content not found or no access

### `GET /api/subtitles?url=<encoded_url>`

Proxy subtitle files to bypass CORS restrictions.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `url` | string | URL-encoded subtitle file URL (required) |

**Response:**
- Content-Type: `text/vtt` or `text/plain`
- Body: Subtitle file content

**Use Case:**
External CDN subtitle files may lack CORS headers. This endpoint proxies them to allow browser loading.

**Example:**
```
GET /api/subtitles?url=https%3A%2F%2Fcdn.media.ccc.de%2Fsubs.vtt
```

### `GET /api/search?q=<query>`

Search content by title, description, or speakers.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (required) |
| `limit` | number | Max results (default: 20) |

**Response:**
```json
{
  "results": [{ "id": "...", "title": "...", ... }]
}
```

### `GET /api/me`

Get current user info.

**Response:**
```json
{
  "id": "demo-user",
  "tier": "basic",
  "authenticated": true,
  "contentAccess": ["39c3", "38c3"]
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

---

## Admin Endpoints

All admin endpoints require `tier: "admin"`.

### Users

#### `GET /api/admin/users`

List all users.

**Response:**
```json
{
  "users": [
    {
      "id": "user-abc123",
      "email": "user@example.com",
      "tier": "basic",
      "status": "active",
      "contentIds": ["39c3", "38c3"],
      "createdAt": "2024-01-01T00:00:00Z",
      "apiKeyPreview": "7da6...1a57"
    }
  ]
}
```

#### `POST /api/admin/users`

Create a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "tier": "basic",
  "contentIds": ["39c3", "38c3"]
}
```

**Response:**
```json
{
  "id": "user-abc123",
  "email": "user@example.com",
  "tier": "basic",
  "apiKey": "a1b2c3d4e5f6... (show only once!)",
  "contentIds": ["39c3", "38c3"]
}
```

#### `PATCH /api/admin/users/:id`

Update a user.

**Body:**
```json
{
  "tier": "premium",
  "contentIds": ["*"],
  "status": "active"
}
```

#### `DELETE /api/admin/users/:id`

Delete a user.

#### `POST /api/admin/users/:id/reset-key`

Reset a user's API key. Returns the new key (shown only once).

**Response:**
```json
{
  "id": "user-abc123",
  "apiKey": "new_key_here... (show only once!)"
}
```

#### `PATCH /api/admin/users/:id/status`

Block or unblock a user.

**Body:**
```json
{ "status": "blocked" }
```

Valid statuses: `active`, `blocked`

### Ingest

#### `GET /api/admin/ingest/status`

Get ingest pipeline status.

**Response:**
```json
{
  "connectors": ["ccc", "peertube", "infocon"],
  "totalItems": 150,
  "sourceStats": { "ccc": 100, "peertube": 50 },
  "lastRun": { "ccc": "2024-01-01T00:00:00Z" }
}
```

#### `POST /api/admin/ingest/run`

Trigger content ingestion.

**Body (optional):**
```json
{
  "source": "ccc",
  "upsert": true,
  "limit": 20
}
```

**Response:**
```json
{
  "results": [
    { "source": "ccc", "added": 5, "duplicates": 95, "updated": 0, "total": 150 }
  ]
}
```

### Content

#### `GET /api/admin/content`

List all content (no access restrictions).

**Query Params:** Same as `/api/playlist` but shows all content.

#### `DELETE /api/admin/content/:id`

Remove a content item from the store.

#### `GET /api/admin/content/sources`

Get available content sources and stats.

**Response:**
```json
{
  "sources": {
    "ccc": { "count": 100, "lastIngest": "2024-01-01T00:00:00Z" },
    "peertube": { "count": 50, "lastIngest": "2024-01-01T00:00:00Z" }
  }
}
```
