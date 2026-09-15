# Backoffice Admin Panel

URL: `http://localhost:4321/admin`

The backoffice is a web UI for managing users, content ingestion, and permissions.

## Access

Requires an admin API key. Set via environment variable or configured on first run:

```bash
ADMIN_API_KEY=your_admin_key bun run dev:backend
```

## Features

### 1. Dashboard

Overview of system status:
- Total users, content items, sources
- Recent ingest runs
- User activity summary

### 2. User Management

| Action | Description |
|--------|-------------|
| List users | View all users with tier, status, last active |
| Create user | Generate new API key for a user |
| Edit user | Change tier, contentIds, email |
| Block/unblock | Toggle user status between active/blocked |
| Reset API key | Generate new key (old key immediately invalid) |
| Delete user | Remove user entirely |

### 3. Content Ingest

| Action | Description |
|--------|-------------|
| View status | See source stats, last ingest time |
| Run ingest | Trigger ingestion for one or all sources |
| View content | Browse all content regardless of ACL |
| Delete content | Remove individual items |

### 4. Permissions

| Action | Description |
|--------|-------------|
| View ACL | See which content each tier can access |
| Edit contentIds | Modify what conferences/sources a user can access |

## API Endpoints

See [API Reference](./api-reference.md#admin-endpoints) for full details.

Key endpoints:
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/reset-key` - Reset API key
- `PATCH /api/admin/users/:id/status` - Block/unblock
- `GET /api/admin/ingest/status` - Ingest status
- `POST /api/admin/ingest/run` - Trigger ingest
- `GET /api/admin/content` - All content
- `DELETE /api/admin/content/:id` - Remove content
