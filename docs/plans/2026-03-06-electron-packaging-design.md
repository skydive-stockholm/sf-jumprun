# Electron Packaging + Auto-Update Design

## Goal

Package the sf-jumprun app (Vue 3 frontend + Express/SerialPort backend) as a standalone Electron desktop app with auto-updates via GitHub Releases.

## Architecture

```
Electron Main Process
├── Express Backend (embedded, not spawned)
│   ├── Public server (port 3008) — serves dist/, SSE, API
│   ├── Private server (port 3009) — admin writes
│   ├── SerialPort listener
│   └── SSE broadcast
├── System Tray (show/hide window, quit)
└── Auto-updater (electron-updater → GitHub Releases)

Electron Renderer (BrowserWindow)
└── Loads http://localhost:3008
    └── Vue app with admin/public toggle
```

### Key Decisions

- Renderer loads `http://localhost:3008` (not `file://`) so SSE, API, and routing work identically to web version
- Backend imported directly into Electron main process, no child process
- `data.json` stored in Electron `userData` directory (`%APPDATA%/sf-jumprun/`) so it persists across updates
- Admin/public toggle is a Vue UI component, not Electron menus

## Views

- **Admin view:** Full controls, editable map, staff management (default in Electron)
- **Public view:** Display-only map, same as visiting `http://localhost:3008` in a browser
- Toggle via a button in the Vue app UI
- Public view also accessible externally at `http://localhost:3008`

## Auto-Update

- `electron-updater` checks GitHub Releases on launch + periodically
- Downloads in background, notifies user, installs on next restart
- Release triggered by pushing a git tag (`vX.Y.Z`)
- `package.json` version drives release version

## Build Targets

- **Windows:** NSIS installer (`.exe`)
- **macOS:** DMG (`.dmg`)
- Code signing placeholders for future configuration

## New/Modified Files

```
electron/
  main.js          — Main process: starts backend, window, tray, updater
  preload.js       — Minimal preload script
src/
  components/
    ViewToggle.vue  — Admin/public toggle button
electron-builder.yml — Build and publish config
package.json       — Electron deps, scripts, build config
backend/backend.js — Make data.json path configurable
```

## Dependencies to Add

- `electron` (dev)
- `electron-builder` (dev)
- `electron-updater` (runtime)
