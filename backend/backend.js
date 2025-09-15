import express from 'express'
import storage from './utils/storage.js'
import serialport from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
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
    // Save posted data to storage
    const data = storage.fetch()
    storage.save({ ...data, ...req.body })

    res.send({ message: 'success' })
})

let clients = []

publicApp.get('/subscribe', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
    }
    res.writeHead(200, headers)

    const d = storage.fetch()
    const data = `data: ${JSON.stringify(d)}\n\n`

    res.write(data)

    const clientId = Date.now()

    const newClient = {
        id: clientId,
        response: res,
    }

    clients.push(newClient)

    console.log(`${clientId} Connection opened!`)

    req.on('close', () => {
        console.log(`${clientId} Connection closed`)
        clients = clients.filter(client => client.id !== clientId)
    })
})

export function sendEventsToAll(d) {
    clients.forEach(client => {
        const data = `data: ${JSON.stringify(d)}\n\n`

        client.response.write(data)
    })
}

serialport.SerialPort.list().then(res => {
    res.find(port => {
        if (port.serialNumber !== '2096326F4D53') {
            return
        }

        console.log('Found port')

        const serialPort = new serialport.SerialPort(
            {
                path: port.path,
                baudRate: 9600,
                autoOpen: true,
            },
            function (err) {
                if (err) {
                    return console.log('Error: ', err.message)
                }
            },
        )

        const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }))

        parser.on('data', chunk => {
            // Silly bugfix for incorrect format sent from hardware
            chunk = chunk.replace(/ /g, '"')
            chunk = chunk.replace(/:/g, '":')
            chunk = chunk.replace('"}', '}')

            console.log(chunk)

            // Write to DB
            const chunkData = JSON.parse(chunk)
            const newData = {
                jumprun: {
                    start: chunkData.start / 2048,
                    end: chunkData.end / 2048,
                    shift: chunkData.shift / 4096,
                    angle: chunkData.angle,
                },
            }

            const data = storage.fetch()
            storage.save({ ...data, ...newData })
        })

        serialPort.write('x')
    })
})

// Listen for changes in data.json
const filePath = './backend/data.json'

// Ensure data.json exists
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}', 'utf8') // start with empty JSON object
}

fs.watch(filePath, (eventType, filename) => {
    if (filename) {
        console.log(`File ${filename} has been modified!`)

        // Read the updated file contents
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err)
                return
            }

            try {
                // Parse the JSON data
                const jsonData = JSON.parse(data)

                // Output the parsed JSON data
                console.log('Updated JSON data:', jsonData)

                sendEventsToAll(jsonData)

                // Perform any desired actions with the parsed JSON data
                // ...
            } catch (error) {
                console.error('Error parsing JSON:', error)
            }
        })
    }
})

publicApp.listen(publicPort, () => {
    console.log(`Jump run public app listening on port ${publicPort}`)
})

privateApp.listen(privatePort, () => {
    console.log(`Jump run private app listening on port ${privatePort}`)
})
