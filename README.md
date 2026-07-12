# SF Jump Run

Real-time jump run visualization for Skydive Stockholm (Gryttjom Airfield). A
Leaflet satellite map shows concentric distance rings, the jump run line,
ground + aloft weather, and staff info. Data is pushed live from a hardware
serial device through a Node.js backend over Server-Sent Events, and the whole
thing ships as an Electron desktop app for the drop-zone display.

## Development

```bash
npm install
npm run dev          # Vite frontend on :3000
npm run backend      # backend + SSE (nodemon, dev)
npm run electron:dev # Vite + Electron together
npm test             # unit tests
npm run lint         # eslint
npm run format       # prettier
```

## Build

```bash
npm run electron:build:win   # Windows x64 installer -> release/
npm run electron:build:mac   # macOS DMG -> release/
```

Building the Windows installer from macOS uses Wine (downloaded automatically by
electron-builder on first run). Builds default to **x64** — the standard
architecture for the drop-zone display PC.

## Releasing (auto-update via GitHub Releases)

The Electron app checks GitHub Releases on launch and self-updates via
`electron-updater`. To ship a new version:

1. **Bump the version** in `package.json`. Auto-update only fires when the
   release version is **higher** than the installed one.

2. **Build and upload** to a draft GitHub release (installer + `latest.yml`
   update manifest + blockmap):

   ```bash
   export GH_TOKEN="$(gh auth token)"
   npm run electron:publish:win
   ```

3. **Publish the release** so clients can see it. `electron-updater` runs
   unauthenticated and **cannot see draft releases** — the update channel is
   not live until this step:

   ```bash
   gh release edit vX.Y.Z --repo skydive-stockholm/sf-jumprun --draft=false
   ```

Installed apps then download the update in the background and show the in-app
update banner.

Notes:

- Builds are **unsigned**. Auto-updates still work on Windows (verified by
  sha512/blockmap, not signature), but a fresh install shows a SmartScreen
  "unknown publisher" warning.
- If the display PC is ARM64 rather than x64, build with `--arm64` instead.

## Fail-safe / recovery

The app recovers automatically from crashes and network outages, and can be set
up to come back after a power cut. See [RESILIENCE.md](RESILIENCE.md).

## Architecture

See [CLAUDE.md](CLAUDE.md) for a full breakdown of the frontend, Electron, and
backend layers and the data flow.
