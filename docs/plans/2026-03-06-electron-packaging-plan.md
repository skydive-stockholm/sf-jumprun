# Electron Packaging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Package sf-jumprun as an Electron desktop app with embedded backend, system tray, admin/public view toggle, and auto-updates via GitHub Releases.

**Architecture:** Electron main process imports and starts the Express backend directly. Renderer loads `http://localhost:3008`. Vue app gains a view mode toggle (admin/public). Auto-updates via `electron-updater` pulling from GitHub Releases.

**Tech Stack:** Electron, electron-builder, electron-updater, existing Vue 3 + Vite + Express stack.

---

### Task 1: Install Electron dependencies and create project scaffolding

**Files:**
- Modify: `package.json`
- Create: `electron/main.js`
- Create: `electron/preload.js`

**Step 1: Install dependencies**

Run:
```bash
npm install --save electron-updater
npm install --save-dev electron electron-builder concurrently wait-on
```

**Step 2: Update package.json**

Add `"main": "electron/main.js"` to the top level.

Update scripts:
```json
{
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac"
}
```

Change `"version"` to `"1.0.0"` (needed for electron-builder and auto-updates).

Remove `"private": true` (electron-builder needs to publish).

Add author and description fields if missing.

**Step 3: Create `electron/preload.js`**

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    installUpdate: () => ipcRenderer.send('install-update'),
})
```

**Step 4: Create `electron/main.js`** (minimal shell first, flesh out in later tasks)

```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    win.loadURL('http://localhost:3008')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Electron scaffolding with main process and preload"
```

---

### Task 2: Embed the backend into Electron main process

**Files:**
- Modify: `electron/main.js`
- Modify: `backend/backend.js` — make it exportable (start servers via function, not on import)
- Modify: `backend/utils/storage.js` — accept configurable data path

**Step 1: Refactor `backend/utils/storage.js`**

Add an exported `setDataDir` function that overrides the default path. The existing `createStorage` already accepts a path, so we just need to allow the default export to be re-created:

```js
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let defaultPath = path.join(__dirname, '..', 'data.json')

export function setDataPath(filePath) {
    defaultPath = filePath
}

export function createStorage(filePath) {
    const resolvedPath = filePath || defaultPath
    return {
        fetch() {
            try {
                return JSON.parse(fs.readFileSync(resolvedPath).toString())
            } catch (error) {
                if (error.code === 'ENOENT' || error instanceof SyntaxError) {
                    fs.writeFileSync(resolvedPath, JSON.stringify({}))
                    return {}
                }
                throw error
            }
        },
        save(data) {
            fs.writeFileSync(resolvedPath, JSON.stringify(data))
        },
    }
}

export default { createStorage, setDataPath, getDefault: () => createStorage() }
```

Wait — the default export is used as `storage.fetch()` and `storage.save()` throughout. We need to keep backward compatibility. Better approach: make `backend/backend.js` accept a config object and pass the data path through.

**Revised approach for `backend/backend.js`:** Extract the server start logic into an exported `startBackend(options)` function. When called from Electron, pass `{ dataDir: app.getPath('userData') }`. When run standalone (existing `npm run backend`), use the current defaults.

Modify `backend/backend.js`:

```js
import express from 'express'
import { createStorage } from './utils/storage.js'
import { sanitizeStorage } from './utils/sanitize.js'
import { addClient, sendEventsToAll } from './sse.js'
import { initSerial } from './serial.js'
import * as fs from 'node:fs'
import * as path from 'node:path'

export function startBackend(options = {}) {
    const dataPath = options.dataPath || path.join(
        path.dirname(new URL(import.meta.url).pathname),
        'data.json',
    )
    const distPath = options.distPath || 'dist'

    const storage = createStorage(dataPath)

    const publicApp = express()
    const privateApp = express()
    const publicPort = 3008
    const privatePort = 3009

    privateApp.use(express.json())
    publicApp.use(express.json())
    publicApp.use(express.static(distPath))

    publicApp.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
    })

    privateApp.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
    })

    publicApp.get('/api/storage', (req, res) => {
        const data = storage.fetch()
        res.send(data)
    })

    privateApp.post('/api/storage', (req, res) => {
        const data = storage.fetch()
        const sanitized = sanitizeStorage(req.body)
        storage.save({ ...data, ...sanitized })
        res.send({ message: 'success' })
    })

    publicApp.get('/subscribe', (req, res) => {
        addClient(req, res)
        const d = storage.fetch()
        res.write(`data: ${JSON.stringify(d)}\n\n`)
    })

    // Serve index.html for all non-API routes (SPA fallback)
    publicApp.get('*', (req, res) => {
        res.sendFile(path.join(path.resolve(distPath), 'index.html'))
    })

    initSerial(jumprun => {
        const data = storage.fetch()
        storage.save({ ...data, jumprun: { ...jumprun } })
    })

    if (!fs.existsSync(dataPath)) {
        const originalData = {
            jumprun: { start: -0.2, end: 0.2, angle: 30, shift: 0 },
            staff: { manifestor: '', jumpLeader: '', pilot: '' },
        }
        fs.writeFileSync(dataPath, JSON.stringify(originalData), 'utf8')
    }

    let debounceTimer = null
    fs.watch(dataPath, (eventType, filename) => {
        if (!filename) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            console.log(`File ${filename} has been modified!`)
            fs.readFile(dataPath, 'utf8', (err, data) => {
                if (err) { console.error('Error reading file:', err); return }
                try {
                    const jsonData = JSON.parse(data)
                    console.log('Updated JSON data:', jsonData)
                    sendEventsToAll(jsonData)
                } catch (error) {
                    console.error('Error parsing JSON:', error)
                }
            })
        }, 100)
    })

    const publicServer = publicApp.listen(publicPort, () => {
        console.log(`Jump run public app listening on port ${publicPort}`)
    })

    const privateServer = privateApp.listen(privatePort, () => {
        console.log(`Jump run private app listening on port ${privatePort}`)
    })

    return { publicServer, privateServer }
}

// Run standalone when executed directly
const isMain = !process.env.ELECTRON_RUN_AS_NODE && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
if (isMain || (!process.versions.electron && process.argv[1]?.includes('backend.js'))) {
    startBackend()
}
```

Note: The standalone detection is tricky with ESM. A simpler approach — keep a separate entry point. Add `backend/standalone.js`:

```js
import { startBackend } from './backend.js'
startBackend()
```

Then update `package.json` backend script to `"backend": "nodemon backend/standalone.js --ignore 'data.json'"`.

**Step 2: Create `backend/standalone.js`**

```js
import { startBackend } from './backend.js'
startBackend()
```

**Step 3: Update `package.json` backend script**

Change: `"backend": "nodemon backend/standalone.js --ignore 'data.json'"`

**Step 4: Update `electron/main.js` to start backend**

Since backend uses ESM and Electron main uses CJS, we need to dynamically import:

```js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow

async function startBackendServer() {
    const backend = await import(
        path.join(__dirname, '..', 'backend', 'backend.js').replace(/\\/g, '/')
        |> (p => 'file:///' + p)
    )
    // Actually, use pathToFileURL:
}
```

**Problem:** Mixing CJS Electron main with ESM backend is messy. Better solution: make `electron/main.js` ESM too, or use a CJS wrapper for backend.

**Best approach:** Create `electron/main.cjs` (CJS for Electron) that uses `child_process.fork` or dynamic import. Actually, the cleanest way is:

Make `electron/main.js` a CommonJS file (Electron expects CJS for main). Use dynamic `import()` for the ESM backend:

```js
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

let mainWindow
let tray

async function startBackendServer() {
    const distPath = path.join(__dirname, '..', 'dist')
    const dataPath = path.join(app.getPath('userData'), 'data.json')

    const backendUrl = pathToFileURL(
        path.join(__dirname, '..', 'backend', 'backend.js')
    ).href

    const { startBackend } = await import(backendUrl)
    startBackend({ dataPath, distPath })
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    mainWindow.loadURL('http://localhost:3008')

    mainWindow.on('close', (event) => {
        event.preventDefault()
        mainWindow.hide()
    })
}

app.whenReady().then(async () => {
    await startBackendServer()
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
```

**Step 5: Test standalone backend still works**

Run: `npm run backend`
Expected: Backend starts on ports 3008/3009 as before.

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor: make backend startable as module for Electron embedding"
```

---

### Task 3: Add system tray

**Files:**
- Modify: `electron/main.js`
- Create: `electron/icon.png` (app icon — can use a placeholder initially)

**Step 1: Add tray icon**

Create or copy a 256x256 PNG icon to `electron/icon.png`. For now, use a simple placeholder (can be the app favicon or a skydiving icon).

**Step 2: Add tray setup to `electron/main.js`**

Add after `createWindow()`:

```js
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png')
    tray = new Tray(nativeImage.createFromPath(iconPath))

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Window',
            click: () => mainWindow.show(),
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                mainWindow.destroy()
                app.quit()
            },
        },
    ])

    tray.setToolTip('SF Jump Run')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => mainWindow.show())
}
```

Call `createTray()` after `createWindow()` in the `app.whenReady()` handler.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add system tray with show/hide and quit"
```

---

### Task 4: Add admin/public view toggle to Vue app

**Files:**
- Create: `src/composables/useViewMode.js`
- Create: `src/components/ViewToggle.vue`
- Modify: `src/components/JumpRunMap.vue` — use view mode to show/hide admin features
- Modify: `src/main.js` — add `/public` route or handle mode via composable

**Step 1: Create `src/composables/useViewMode.js`**

```js
import { ref } from 'vue'

const viewMode = ref('admin')

export function useViewMode() {
    function toggle() {
        viewMode.value = viewMode.value === 'admin' ? 'public' : 'admin'
    }

    return { viewMode, toggle }
}
```

**Step 2: Create `src/components/ViewToggle.vue`**

```vue
<script setup>
import { useViewMode } from '../composables/useViewMode.js'

const { viewMode, toggle } = useViewMode()
</script>

<template>
    <button :class="$style.toggle" @click="toggle">
        {{ viewMode === 'admin' ? 'Switch to Public View' : 'Switch to Admin View' }}
    </button>
</template>

<style module>
.toggle {
    position: fixed;
    z-index: 1000;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: monospace;
    backdrop-filter: blur(4px);
}

.toggle:hover {
    background: rgba(0, 0, 0, 0.85);
}
</style>
```

**Step 3: Modify `src/components/JumpRunMap.vue`**

Import and use the view mode:

```js
import { useViewMode } from '../composables/useViewMode.js'
import ViewToggle from './ViewToggle.vue'

const { viewMode } = useViewMode()
```

Replace the existing `isAdmin` const:

```js
const isElectron = !!window.electronAPI
const isAdmin = computed(() => {
    if (isElectron) return viewMode.value === 'admin'
    return window.location.hostname === 'localhost'
})
```

Add `computed` to the Vue imports.

Guard admin features with `isAdmin.value` (it was already a const, now it's a computed ref — update usages):
- `toggleAdminDialog`: check `isAdmin.value` instead of checking hostname
- `if (isAdmin)` → `if (isAdmin.value)` in onMounted
- Conditionally show admin dialog, save button
- Show `<ViewToggle />` only when `isElectron` is true

In template, add `<ViewToggle v-if="isElectron" />` and wrap admin elements with `v-if="isAdmin"`.

**Step 4: Watch `isAdmin` to init/remove drag handles when switching modes**

```js
watch(isAdmin, (newVal) => {
    if (newVal && map.value) {
        dragHandles = useDragHandles(map.value, data.jumprun, {
            hasUnsavedChanges,
            isDragging,
        })
        dragHandles.init()
    } else {
        dragHandles?.remove()
        dragHandles = null
    }
})
```

**Step 5: Test**

Run: `npm run dev` and verify:
- Visiting in browser shows map (admin features on localhost as before)
- No ViewToggle button visible in browser (only in Electron)

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add admin/public view toggle for Electron"
```

---

### Task 5: Configure electron-builder

**Files:**
- Create: `electron-builder.yml`

**Step 1: Create `electron-builder.yml`**

```yaml
appId: com.skydive.jumprun
productName: SF Jump Run
directories:
  output: release

files:
  - dist/**/*
  - backend/**/*
  - "!backend/node_modules/**/*"
  - electron/**/*
  - "!node_modules/**/*"

extraMetadata:
  main: electron/main.js

win:
  target: nsis
  icon: electron/icon.png

mac:
  target: dmg
  icon: electron/icon.png
  category: public.app-category.utilities

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true

publish:
  provider: github
  owner: GITHUB_USERNAME
  repo: sf-jumprun

asar: true

extraResources:
  - from: backend/node_modules
    to: backend/node_modules
    filter:
      - "**/*"
```

Wait — since the backend has its own `node_modules` (serialport with native bindings), we need to handle this carefully. The backend deps need to be included and the native modules need to be rebuilt for the target platform.

**Revised approach:** Move backend dependencies into the root `package.json` as `dependencies` (electron-builder packs `dependencies` but not `devDependencies`). This way electron-builder handles native module rebuilding automatically.

Actually, the simplest approach: keep backend deps in root `package.json` dependencies, and use `asar: false` or `asarUnpack` for native modules.

**Better revised `electron-builder.yml`:**

```yaml
appId: com.skydive.jumprun
productName: SF Jump Run
directories:
  output: release

files:
  - dist/**/*
  - backend/**/*
  - electron/**/*
  - package.json

extraMetadata:
  main: electron/main.js

win:
  target: nsis
  icon: electron/icon.png

mac:
  target: dmg
  icon: electron/icon.png
  category: public.app-category.utilities

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true

publish:
  provider: github

asarUnpack:
  - "node_modules/serialport/**"
  - "node_modules/@serialport/**"
```

**Step 2: Merge backend dependencies into root `package.json`**

Move these from `backend/package.json` to root `package.json` `dependencies`:

```json
{
    "@serialport/parser-readline": "^11.0.0",
    "cheerio": "^1.0.0-rc.12",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsdom": "^22.1.0",
    "node-fetch": "^3.3.2",
    "serialport": "^11.0.0"
}
```

Remove `node-static`, `rest-client`, `sse-stream` (unused in current code).

Update backend imports to use root node_modules (they should resolve automatically).

**Step 3: Run `npm install` to install new deps**

Run: `npm install`

**Step 4: Verify backend still works with root deps**

Run: `npm run backend`
Expected: Starts on ports 3008/3009

**Step 5: Commit**

```bash
git add -A && git commit -m "build: configure electron-builder for Windows and macOS"
```

---

### Task 6: Add auto-updater

**Files:**
- Modify: `electron/main.js`
- Modify: `electron/preload.js` (already done in Task 1)
- Create: `src/components/UpdateNotification.vue`
- Modify: `src/components/JumpRunMap.vue` — show update notification

**Step 1: Add auto-updater to `electron/main.js`**

```js
const { autoUpdater } = require('electron-updater')

// In app.whenReady():
autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update-available')
})

autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
})

ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall()
})

ipcMain.handle('get-app-version', () => {
    return app.getVersion()
})
```

**Step 2: Create `src/components/UpdateNotification.vue`**

```vue
<script setup>
import { ref, onMounted } from 'vue'

const updateReady = ref(false)

onMounted(() => {
    if (!window.electronAPI) return

    window.electronAPI.onUpdateDownloaded(() => {
        updateReady.value = true
    })
})

function install() {
    window.electronAPI.installUpdate()
}
</script>

<template>
    <div v-if="updateReady" :class="$style.banner">
        A new version is available.
        <button :class="$style.button" @click="install">
            Restart to update
        </button>
    </div>
</template>

<style module>
.banner {
    position: fixed;
    z-index: 2000;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px 16px;
    background: #4a8af4;
    color: #fff;
    text-align: center;
    font-family: monospace;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.button {
    padding: 4px 12px;
    background: #fff;
    color: #4a8af4;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-family: monospace;
}
</style>
```

**Step 3: Add `<UpdateNotification />` to `JumpRunMap.vue` template**

```vue
<UpdateNotification />
```

Import it:
```js
import UpdateNotification from './UpdateNotification.vue'
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add auto-updater with in-app notification"
```

---

### Task 7: Handle Vite env vars in Electron production build

**Files:**
- Modify: `vite.config.js` — ensure env vars are baked in at build time

**Step 1: Verify `.env` has correct values for production build**

The `VITE_HOST` should be `localhost` (Electron always connects locally).
The `VITE_MAPBOX_API_KEY` must be set.

These get baked into the Vite build at `npm run build` time, so no runtime config needed.

**Step 2: Add SPA fallback to backend**

Already handled in Task 2 — the `publicApp.get('*')` route serves `index.html` for Vue Router history mode.

**Step 3: Commit (if any changes)**

---

### Task 8: Test the full Electron dev flow

**Step 1: Build frontend**

Run: `npm run build`

**Step 2: Test Electron in dev mode**

Run: `npm run electron:dev`

Expected:
- Vite dev server starts on 3000
- Electron window opens
- Map loads with jump run display
- View toggle button visible in bottom-right
- System tray icon appears
- Clicking toggle switches between admin/public views
- Closing window hides to tray

**Step 3: Test production build**

Run: `npm run electron:build`

Expected: Installer created in `release/` directory.

**Step 4: Commit any fixes**

---

### Task 9: Final cleanup and documentation

**Files:**
- Modify: `README.md` or `CLAUDE.md` — add Electron commands
- Modify: `.gitignore` — add `release/` directory

**Step 1: Add `release/` to `.gitignore`**

```
release/
```

**Step 2: Update `CLAUDE.md` with new commands**

Add to Commands section:
```
- **Electron dev:** `npm run electron:dev` (runs Vite + Electron concurrently)
- **Electron build (Windows):** `npm run electron:build:win`
- **Electron build (macOS):** `npm run electron:build:mac`
```

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: add Electron build artifacts to gitignore, update docs"
```
