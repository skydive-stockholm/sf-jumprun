const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { pathToFileURL } = require('url')

const isDev = !app.isPackaged
let mainWindow
let tray

async function startBackendServer() {
    const distPath = path.join(__dirname, '..', 'dist')
    const dataPath = path.join(app.getPath('userData'), 'data.json')

    const backendUrl = pathToFileURL(
        path.join(__dirname, '..', 'backend', 'backend.js'),
    ).href

    const { startBackend } = await import(backendUrl)
    startBackend({ dataPath, distPath })
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
        },
    })

    mainWindow.loadURL(isDev ? 'http://localhost:3000' : 'http://localhost:3008')

    mainWindow.on('close', (event) => {
        if (process.platform === 'win32') {
            event.preventDefault()
            mainWindow.hide()
        }
    })
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
