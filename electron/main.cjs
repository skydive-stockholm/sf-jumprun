const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { pathToFileURL } = require('url')

const isDev = !app.isPackaged
let mainWindow
let tray

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception (app stays up):', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection (app stays up):', err)
})

async function startBackendServer() {
    const distPath = path.join(__dirname, '..', 'dist')
    const dataPath = path.join(app.getPath('userData'), 'data.json')

    const backendUrl = pathToFileURL(
        path.join(__dirname, '..', 'backend', 'backend.js'),
    ).href

    const { startBackend } = await import(backendUrl)
    startBackend({ dataPath, distPath })
}

function loadApp() {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const base = isDev ? 'http://localhost:3000' : 'http://localhost:3008'
    mainWindow.loadURL(`${base}/admin`).catch(() => {
        // Backend not up yet (e.g. just booted) — keep retrying.
        setTimeout(loadApp, 2000)
    })
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
        },
    })

    // Retry when the page fails to load (backend still starting, transient
    // network error, etc.).
    mainWindow.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            if (isMainFrame) setTimeout(loadApp, 2000)
        },
    )

    // Recover from renderer crashes and hangs.
    mainWindow.webContents.on('render-process-gone', () => {
        setTimeout(loadApp, 1000)
    })

    mainWindow.on('unresponsive', () => {
        loadApp()
    })

    mainWindow.on('close', (event) => {
        if (process.platform === 'win32') {
            event.preventDefault()
            mainWindow.hide()
        }
    })

    loadApp()
}

function createTray() {
    const iconPath = path.join(__dirname, 'icon.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

    tray = new Tray(icon)

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

app.whenReady().then(async () => {
    await startBackendServer()
    createWindow()
    createTray()

    if (!isDev) {
        // Relaunch automatically after a reboot / power restore.
        app.setLoginItemSettings({
            openAtLogin: true,
            path: process.execPath,
        })

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
    }

    ipcMain.handle('get-app-version', () => {
        return app.getVersion()
    })
})

app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
    } else {
        createWindow()
    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
