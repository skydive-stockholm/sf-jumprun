# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A skydiving jump run visualization app for a Swedish drop zone (Skydive Stockholm / Gryttjom Airfield). Displays a Mapbox satellite map with concentric distance circles, a jump run line, weather data (ground + aloft), and staff info. Data is pushed in real-time from a hardware serial device (physical jump run controller) through a Node.js backend via Server-Sent Events.

## Commands

- **Frontend dev server:** `npm run dev` (Vite on port 3000)
- **Build:** `npm run build` (output to `dist/`)
- **Backend:** `npm run backend` (runs `nodemon backend/standalone.js`, watches for changes, ignores `data.json`)
- **Electron dev:** `npm run electron:dev` (runs Vite + Electron concurrently)
- **Electron build:** `npm run electron:build` (builds frontend + packages Electron app)
- **Electron build (Windows):** `npm run electron:build:win`
- **Electron build (macOS):** `npm run electron:build:mac`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Backend deps:** `cd backend && npm install` (separate package.json for standalone usage)
- **Deploy/startup:** `bash startup.ps1` — resets to origin/main, builds, installs deps, starts backend
- **Upload to Azure:** `pwsh uploadtoazure.ps1` — pushes `backend/data.json` to Azure Table Storage

## Architecture

### Frontend (Vue 3 + Vite)
- **Entry:** `src/main.js` — sets up Vue Router with two routes: `/` (map view) and `/admin` (admin panel)
- **`src/components/JumpRunMap.vue`** — Main view. Initializes Mapbox GL map, connects to backend via SSE (`/subscribe` on port 3008), falls back to polling `/api/storage`. Updates the jump run line on the map when data changes. Admin dialog (localhost only) allows editing staff info.
- **`src/components/JumpRunInfoBox.vue`** — Overlay showing jump run heading, start/end distances, separation rules, weather, and staff
- **`src/components/JumpRunWeather.vue`** — Fetches and displays ground weather + winds aloft at 600m/1500m/3000m from `insidan.skydive.se` API
- **`src/utils/geometry.js`** — Turf.js helpers for drawing map features: circles (nautical mile rings), axis lines, jump run arrow with directional indicator
- **`src/composables/useWeather.js`** / **`useWeatherAloft.js`** — Vue composables fetching weather data on intervals (ground: 1min, aloft: 15min)
- **`src/data/coordinates.js`** — Map center from `VITE_MAP_CENTER` env var (defaults to ESKG Gryttjom)

### Electron (Desktop App)
- **`electron/main.cjs`** — Main process: starts backend, creates BrowserWindow loading `http://localhost:3008`, system tray, auto-updater via `electron-updater` + GitHub Releases
- **`electron/preload.cjs`** — Exposes `electronAPI` to renderer (app version, update events)
- **`src/composables/useViewMode.js`** — Toggles admin/public view mode in Electron
- **`src/components/ViewToggle.vue`** — UI toggle button (only shown in Electron)
- **`src/components/UpdateNotification.vue`** — Auto-update banner
- **`electron-builder.yml`** — Build config for Windows (NSIS) and macOS (DMG)

### Backend (Express + SerialPort)
- **`backend/backend.js`** — Exports `startBackend(options)`. Two Express servers:
  - **Public (port 3008):** serves built frontend from `dist/`, SSE endpoint `/subscribe`, GET `/api/storage`
  - **Private (port 3009):** POST `/api/storage` for writing data
- **`backend/utils/storage.js`** — JSON file-based storage reading/writing `backend/data.json`
- Reads serial data from a hardware device (specific serial number `2096326F4D53`), parses jump run parameters (start, end, shift, angle), and broadcasts changes via SSE
- Also watches `backend/data.json` for external modifications and pushes updates to all SSE clients

### Data Flow
Hardware serial device → backend parses → writes `data.json` → fs.watch triggers → SSE broadcast → frontend updates map. Admin panel (localhost) → POST to private port 3009 → saves to `data.json` → same broadcast path.

## Settings
- Mapbox API key and map center are configured via the **Settings panel** in the admin UI (stored in `data.json`)
- On first launch, an onboarding screen prompts for these settings
- `.env` file is **deprecated** — only Azure credentials remain there (`AZURE_STORAGE_ACC`, `AZURE_STORAGE_TABLE`, `AZURE_SAS_TOKEN`)

## Code Style
- Prettier: 4-space indent, no semicolons, single quotes, trailing commas
- ESLint: `eslint:recommended` + `plugin:vue/vue3-recommended` + `prettier`
- Vue 3 `<script setup>` with CSS Modules (`<style module>`)
