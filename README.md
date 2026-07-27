# SF Jump Run

Real-time jump run visualization for Skydive Stockholm (Gryttjom Airfield). A
Leaflet satellite map shows concentric distance rings, the jump run line,
ground + aloft weather, and staff info. Data is pushed live from a hardware
serial device through a Node.js backend over Server-Sent Events, and the whole
thing ships as an Electron desktop app for the drop-zone display.

There are two views:

- **`/`** — the public display. Read-only, shown on the screen in manifest.
- **`/admin`** — the jump leader's view. Same map, plus draggable handles for
  the jump run, a settings panel, and the button that publishes the run.

## Getting started

### Prerequisites

- **Node.js 20+** and npm (developed on 22; vitest wants 20, 22, or 24+)
- Nothing else. No API keys, no database, no account — the app runs offline-ish
  out of the box and falls back to free Esri satellite tiles when no Mapbox
  token is configured.

### Clone and install

```bash
git clone git@github.com:skydive-stockholm/sf-jumprun.git
cd sf-jumprun
npm install
```

The root `package.json` covers both the frontend and the backend. The separate
`backend/package.json` only matters if you want to deploy the `backend/` folder
on its own, without the root `node_modules`.

### Run it

The frontend always needs the backend for data. In two terminals:

```bash
npm run backend   # terminal 1 — :3008 (public) and :3009 (private)
npm run dev       # terminal 2 — :3000 with hot reload
```

Then open:

- <http://localhost:3000> — public view
- <http://localhost:3000/admin> — jump leader view

The dev server proxies `/api/storage` and the `/subscribe` SSE stream through
to the backend, so live data works exactly as it does in production. Start the
backend first; the dev server has nothing to proxy to without it.

To run it the way the drop-zone machine does, build the frontend and let the
backend serve it — no Vite involved, everything on one port:

```bash
npm run build
npm run backend
# http://localhost:3008 and http://localhost:3008/admin
```

On first boot the backend creates `backend/data.json` (gitignored) with empty
staff fields. That file is the entire state of the app.

### First run: setting a jump run

The jump run is **unset on every backend boot** — the public view deliberately
shows no line until someone publishes one, so the display never shows a stale
or default run.

1. Open `/admin`. You'll see a green draft line with three drag handles
   (green = first exit, red = last exit, white = shift the whole run
   sideways), marked _"Draft — not published"_.
2. Drag it into place.
3. Hit **Publish jump run**. The public view picks it up instantly over SSE.

From then on, any drag shows a **Save jump run** button; the public view only
changes when you save.

### Settings

The gear button in `/admin` opens the settings panel. Everything there is
stored in `backend/data.json` and shared with the public view:

| Setting                        | Used for                                         |
| ------------------------------ | ------------------------------------------------ |
| Manifest / Jump leader / Pilot | Staff names in the info box                      |
| Manifest phone                 | Phone number in the info box                     |
| Separation                     | Free-text separation rule shown to jumpers       |
| Exit / Deployment altitude     | Drift box, canopy circle, separation maths       |
| Aircraft speed on jump run     | Time-on-run and separation maths                 |
| Manual winds aloft             | Override the weather API when it's wrong or down |
| Map center                     | `lng, lat` of the drop zone (defaults to ESKG)   |

In the Electron app, a first-launch onboarding screen asks for the map center
before showing the map.

### Ports

| Port   | What                                                          |
| ------ | ------------------------------------------------------------- |
| `3000` | Vite dev server; proxies `/api` and `/subscribe` to :3008     |
| `3008` | Public: built frontend, `GET /api/storage`, SSE `/subscribe`  |
| `3009` | Private: `POST /api/storage`. Only the admin view writes here |

Port 3009 has no authentication — it is meant to stay on the drop-zone LAN,
not on the open internet.

### The hardware controller (optional)

The backend looks for a USB serial device with serial number `2096326F4D53` —
the physical jump run box in manifest. When it's plugged in, turning its knobs
writes straight to `data.json` and the map follows. When it isn't (i.e. on any
dev machine), the backend logs `Serial port not found, retrying...` every five
seconds and everything else works normally; you set the run from `/admin`
instead.

### Satellite tiles

Without configuration the map uses Esri World Imagery, which is free and needs
no key. For the sharper Mapbox satellite layer, set a build-time env var before
building:

```bash
echo 'VITE_MAPBOX_API_KEY="pk.your_token"' >> .env
npm run build
```

`.env` is otherwise deprecated — the only other values it holds are the Azure
credentials used by `uploadtoazure.ps1`.

## Project layout

```
src/
  components/
    PublicMap.vue        # / — read-only display
    JumpRunMap.vue       # /admin — draggable jump run, settings, publish
    JumpRunInfoBox.vue   # the left-hand info column, shared by both views
    SettingsPanel.vue
  composables/           # SSE client, weather polling, drag handles
  utils/
    geometry.js          # Turf.js: rings, jump run line, drift box
    jumprunSuggestion.js # wind-based jump run suggestion + separation maths
backend/
  backend.js             # the two Express servers
  serial.js              # hardware controller reader
  sse.js                 # SSE client registry
  utils/storage.js       # data.json read/write
electron/                # main + preload for the desktop app
tests/                   # vitest, backend + frontend
```

## Development

```bash
npm run dev          # Vite frontend on :3000 (needs the backend running)
npm run backend      # backend + SSE (nodemon, restarts on change)
npm run backend:prod # backend without nodemon
npm run electron:dev # Vite + Electron together (Electron starts the backend)
npm test             # unit tests (vitest)
npm run lint         # eslint --fix over src/
npm run format       # prettier over the whole repo
```

`npm run electron:dev` starts the backend inside the Electron main process, so
don't also run `npm run backend` alongside it — the ports will clash. Note that
Electron keeps its state in `app.getPath('userData')/data.json`, not
`backend/data.json`, so the desktop app and a bare `npm run backend` have
separate jump runs and settings.

`npm run format` rewrites every file in the repo, and the committed code is not
currently prettier-clean — expect unrelated churn if you run it. Prefer
`npx prettier --write <file>` on what you touched.

Style: 4-space indent, no semicolons, single quotes, trailing commas. Vue 3
`<script setup>` with CSS Modules.

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

## Deploying to the drop-zone machine

`startup.ps1` (a bash script despite the name) is what the display machine
runs: it hard-resets to `origin/main`, reinstalls, rebuilds, and starts the
backend. It **discards local changes**, keeping only `.env`.

## Fail-safe / recovery

The app recovers automatically from crashes and network outages, and can be set
up to come back after a power cut. See [RESILIENCE.md](RESILIENCE.md).

## Architecture

Hardware serial device → backend parses → writes `data.json` → `fs.watch`
triggers → SSE broadcast → every connected map updates. The admin view posts to
:3009, which writes the same file and takes the same broadcast path.

See [CLAUDE.md](CLAUDE.md) for a fuller breakdown of the frontend, Electron,
and backend layers.
