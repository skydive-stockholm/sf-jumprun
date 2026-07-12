import serialport from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

const DEVICE_SERIAL = '2096326F4D53'

export function parseSerialChunk(chunk) {
    chunk = chunk.replace('{', '{"')
    chunk = chunk.replace(/ /g, ',"')
    chunk = chunk.replace(/:/g, '":')
    chunk = chunk.replace('"}', '}')

    const parsed = JSON.parse(chunk)
    return {
        start: parsed.start / 2048,
        end: parsed.end / 2048,
        shift: parsed.shift / 4096,
        angle: parsed.angle,
    }
}

export function initSerial(onData) {
    let reconnectTimer = null

    function scheduleReconnect(delay = 5000) {
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            open()
        }, delay)
    }

    function open() {
        serialport.SerialPort.list()
            .then(res => {
                const port = res.find(p => p.serialNumber === DEVICE_SERIAL)

                if (!port) {
                    console.log('Serial port not found, retrying...')
                    scheduleReconnect()
                    return
                }

                console.log('Found port')

                const sp = new serialport.SerialPort(
                    { path: port.path, baudRate: 9600, autoOpen: true },
                    err => {
                        if (err) {
                            console.log('Error: ', err.message)
                            scheduleReconnect()
                        }
                    },
                )

                const parser = sp.pipe(new ReadlineParser({ delimiter: '\n' }))

                parser.on('data', chunk => {
                    try {
                        const jumprun = parseSerialChunk(chunk)
                        onData(jumprun)
                    } catch (error) {
                        console.error(
                            'Error parsing serial data:',
                            error.message,
                        )
                    }
                })

                sp.on('error', err => {
                    console.error('Serial error:', err.message)
                })

                sp.on('close', () => {
                    console.log('Serial port closed, reconnecting...')
                    scheduleReconnect()
                })

                sp.write('x')
            })
            .catch(err => {
                console.error('Error listing serial ports:', err.message)
                scheduleReconnect()
            })
    }

    open()
}
