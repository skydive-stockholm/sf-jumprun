const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

let mainWindow

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
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    mainWindow.loadURL('http://localhost:3008')
}

app.whenReady().then(async () => {
    await startBackendServer()
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
