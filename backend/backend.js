import express from 'express'
import storage from './utils/storage.js'
import serialport from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { WeatherService } from './utils/scraper.js'

const app = express()
const port = 3008

app.use(express.json())
app.use(express.static('../dist'))

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    )
    next()
})

app.get('/api/storage', (req, res) => {
    const data = storage.fetch()
    res.send(data)
})

app.post('/api/storage', (req, res) => {
    // Save posted data to storage
    const data = storage.fetch()
    storage.save({ ...data, ...req.body })

    res.send({ message: 'success' })

    sendEventsToAll(req.body)
})

let clients = []

app.get('/api/scraper', (req, res) => {
    new WeatherService().getLhp().then(data => {
        res.send(data)
    })
})

app.get('/subscribe', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
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

    req.on('close', () => {
        console.log(`${clientId} Connection closed`)
        clients = clients.filter(client => client.id !== clientId)
    })
})

function sendEventsToAll(d) {
    clients.forEach(client => {
        const data = `data: ${JSON.stringify(d)}\n\n`

        client.response.write(data)
    })
}

app.listen(port, () => {
    console.log(`Jump run app listening on port ${port}`)
})

const serialPort = new serialport.SerialPort(
    {
        path: 'COM4',
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
