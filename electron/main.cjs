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
        event.preventDefault()
        mainWindow.hide()
    })
}

function createTray() {
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABgSURBVDiNY/j//z8DEwMDAwMTAwMDw////xn+//9fwPD//38GBgYGhv///zMwMDAwMPz//5+BkZGBgYGR8f9/RkYGBkZGxv+MjIz/GRkZ/jMyMvxnZGT4z8jI8J+BgQEAq+YYSS/MkGYAAAAASUVORK5CYII=',
    )

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
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
