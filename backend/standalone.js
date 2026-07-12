import { startBackend } from './backend.js'

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception (backend stays up):', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection (backend stays up):', err)
})

startBackend()
