import express from 'express'
import storage from './utils/storage.js'
import { sanitizeStorage } from './utils/sanitize.js'
import { addClient, sendEventsToAll } from './sse.js'
import { initSerial } from './serial.js'
import * as fs from 'node:fs'

const publicApp = express()
const privateApp = express()
const publicPort = 3008
const privatePort = 3009

privateApp.use(express.json())

publicApp.use(express.json())
publicApp.use(express.static('dist'))

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

initSerial(jumprun => {
    const data = storage.fetch()
    storage.save({ ...data, jumprun: { ...jumprun } })
})

// Listen for changes in data.json
const filePath = './backend/data.json'

// Ensure data.json exists
if (!fs.existsSync(filePath)) {
    const originalData = {
        jumprun: {
            start: -0.2,
            end: 0.2,
            angle: 30,
            shift: 0
        },
        staff: {
            manifestor: '',
            jumpLeader: '',
            pilot: ''
        }
    }
    fs.writeFileSync(filePath, JSON.stringify(originalData), 'utf8') // start with empty JSON object
}

let debounceTimer = null
fs.watch(filePath, (eventType, filename) => {
    if (!filename) return

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        console.log(`File ${filename} has been modified!`)

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err)
                return
            }

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

publicApp.listen(publicPort, () => {
    console.log(`Jump run public app listening on port ${publicPort}`)
})

privateApp.listen(privatePort, () => {
    console.log(`Jump run private app listening on port ${privatePort}`)
})
