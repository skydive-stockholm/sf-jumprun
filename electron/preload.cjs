const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', callback)
        return () => ipcRenderer.removeListener('update-available', callback)
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', callback)
        return () => ipcRenderer.removeListener('update-downloaded', callback)
    },
    installUpdate: () => ipcRenderer.send('install-update'),
})
