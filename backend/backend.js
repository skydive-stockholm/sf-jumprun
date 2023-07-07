'use strict'
var http = require('http')
const serialport = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

var httpPort = 8080

const port = new serialport.SerialPort({
    path: '/dev/ttyACM0',
    baudRate: 9600,
    autoOpen: true,
})
console.log('Starting')

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

var lastmessage = '{}'

parser.on('data', chunk => {
    // Silly bugfix for incorrect format sent from hardware
    chunk = chunk.replace(/ /g, '"')
    chunk = chunk.replace(/:/g, '":')
    chunk = chunk.replace('"}', '}')
    lastmessage = chunk
})
port.write('x')

var app = http
    .createServer(function (req, res) {
        if (req.url == '/control.json') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            })
            res.write(lastmessage)
            res.end()
        }
    })
    .listen(httpPort)
