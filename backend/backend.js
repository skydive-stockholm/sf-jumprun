import express from 'express'
import { createStorage } from './utils/storage.js'
import { sanitizeStorage } from './utils/sanitize.js'
import { addClient, sendEventsToAll } from './sse.js'
import { initSerial } from './serial.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function startBackend(options = {}) {
    const dataPath = options.dataPath || path.join(__dirname, 'data.json')
    const distPath = options.distPath || path.join(__dirname, '..', 'dist')

    const storage = createStorage(dataPath)

    const publicApp = express()
    const privateApp = express()
    const publicPort = 3008
    const privatePort = 3009

    privateApp.use(express.json())
    publicApp.use(express.json())
    const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'))
    if (hasDistBuild) {
        publicApp.use(express.static(distPath))
    }

    publicApp.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept',
        )
        next()
    })

    privateApp.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept',
        )
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

    publicApp.get('*', (req, res) => {
        if (hasDistBuild) {
            res.sendFile(path.join(path.resolve(distPath), 'index.html'))
        } else {
            res.redirect(`http://localhost:3000${req.originalUrl}`)
        }
    })

    if (!fs.existsSync(dataPath)) {
        const originalData = {
            jumprun: { start: -0.2, end: 0.2, angle: 30, shift: 0 },
            staff: { manifestor: '', jumpLeader: '', pilot: '' },
        }
        fs.writeFileSync(dataPath, JSON.stringify(originalData), 'utf8')
    }

    initSerial((jumprun) => {
        const data = storage.fetch()
        storage.save({ ...data, jumprun: { ...jumprun } })
    })

    let debounceTimer = null
    fs.watch(dataPath, (eventType, filename) => {
        if (!filename) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            console.log(`File ${filename} has been modified!`)
            fs.readFile(dataPath, 'utf8', (err, fileData) => {
                if (err) {
                    console.error('Error reading file:', err)
                    return
                }
                try {
                    const jsonData = JSON.parse(fileData)
                    console.log('Updated JSON data:', jsonData)
                    sendEventsToAll(jsonData)
                } catch (error) {
                    console.error('Error parsing JSON:', error)
                }
            })
        }, 100)
    })

    function attachRetry(server, port, label) {
        server.on('error', (err) => {
            console.error(
                `${label} server error (${err.code || err.message}), retrying in 3s`,
            )
            setTimeout(() => {
                try {
                    server.close()
                } catch {
                    // ignore — server may never have opened
                }
                server.listen(port)
            }, 3000)
        })
    }

    const publicServer = publicApp.listen(publicPort, () => {
        console.log(`Jump run public app listening on port ${publicPort}`)
    })
    attachRetry(publicServer, publicPort, 'public')

    const privateServer = privateApp.listen(privatePort, () => {
        console.log(`Jump run private app listening on port ${privatePort}`)
    })
    attachRetry(privateServer, privatePort, 'private')

    return { publicServer, privateServer }
}
