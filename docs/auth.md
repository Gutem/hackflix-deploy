# Authentication & Authorization

## Model

Hackflix uses **API keys for authorization**, not authentication in the traditional sense. There are no passwords or sessions.

- **AuthN** (Who are you?) → API key identifies a user
- **AuthZ** (What can you access?) → User's `contentIds` array determines access

## API Key Flow

```
1. Admin creates user → generates API key
2. User receives API key (shown once)
3. User sends API key with every request
4. Server hashes key → looks up user by hash
5. User's contentIds determine accessible content
```

## Key Format

- 32 hex characters (128-bit random)
- Example: `7da63ffdcffb58a150211e9d063a1a57`
- Stored as SHA-256 hash (never plaintext)

## Sending API Keys

```bash
# Header (preferred)
curl -H "X-API-Key: 7da63ffdcffb58a150211e9d063a1a57" http://localhost:3001/api/playlist

# Bearer token
curl -H "Authorization: Bearer 7da63ffdcffb58a150211e9d063a1a57" http://localhost:3001/api/playlist

# Query parameter (for simple testing only)
curl "http://localhost:3001/api/api/playlist?api_key=7da63ffdcffb58a150211e9d063a1a57"
```

## User Tiers

| Tier | Content Access | API Key |
|------|---------------|---------|
| `anonymous` | Limited (35C3 only) | None |
| `basic` | Specific conferences | Required |
| `premium` | All content (`["*"]`) | Required |
| `admin` | All content + admin APIs | Required |

## Content Access Control

A user's `contentIds` array controls which content they can access:

```json
// Access to specific conferences
{ "contentIds": ["39c3", "38c3"] }

// Access to all content
{ "contentIds": ["*"] }

// Access by source
{ "contentIds": ["ccc"] }
```

Matching rules:
1. `"*"` → access everything
2. Exact content ID match → access that item
3. Conference name match (case-insensitive) → access all talks from that conference
4. Source name match → access all items from that source

## User Status

| Status | Description |
|--------|-------------|
| `active` | Normal access |
| `blocked` | API key rejected, treated as anonymous |

## Middleware

```javascript
// Require authentication (must have valid API key)
requireAuthN(auth)

// Require specific tier
requireTier(["admin"])

// Require admin
requireTier(["admin"])
```

## Default API Keys

| Key | Tier | Use |
|-----|------|-----|
| `7da63ffdcffb58a150211e9d063a1a57` | basic | Demo/testing |
| `8fdae4d8cc6afe23d593f7956c5e991b` | premium | Full access |
| Set via `ADMIN_API_KEY` env var | admin | Backoffice access |
