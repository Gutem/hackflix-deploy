# Hackflix Desktop

Desktop application wrapper for Hackflix using Tauri.

## How It Works

The desktop app connects to a **running backend API**. You have two options:

### Option 1: Development Mode (Recommended)

Run `bun run dev:desktop` which:
1. Starts the backend API server (port 3001)
2. Starts the frontend dev server (port 4321)
3. Opens the desktop app window

### Option 2: Production Build

For production builds, the desktop app:
1. Packages the static frontend
2. **Requires the backend to be running separately**

You can:
- Run the backend locally: `bun run dev:backend`
- Connect to a remote backend API

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) (1.70+)
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## Development

```bash
# Start backend + frontend + desktop app
bun run dev:desktop
```

## Building

```bash
# Build for current platform
bun run build:desktop

# Build for specific platforms
bun run build:desktop:macos    # macOS (Universal Binary)
bun run build:desktop:windows  # Windows (x64)
bun run build:desktop:linux    # Linux (x64)
```

**Note:** Production builds require the backend API to be running separately. The frontend is built as static files that connect to `http://localhost:3001` by default.

## Output

Built applications are in `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.rpm`, `.AppImage`

## Architecture

```
packages/desktop/
├── src-tauri/
│   ├── src/
│   │   └── main.rs      # Rust backend
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   └── icons/           # App icons
└── package.json         # npm scripts
```

The desktop app wraps the web application and connects to the backend API.

## Configuration

To connect to a different backend API, edit `packages/web/src/pages/index.astro` and `packages/web/src/pages/movie/[id].astro`:

```javascript
const API_BASE = "http://your-api-server:3001";
```
