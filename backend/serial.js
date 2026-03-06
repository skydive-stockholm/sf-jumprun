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
    serialport.SerialPort.list()
        .then(res => {
            const port = res.find(p => p.serialNumber === DEVICE_SERIAL)

            if (!port) {
                console.log('Serial port not found')
                return
            }

            console.log('Found port')

            const sp = new serialport.SerialPort(
                { path: port.path, baudRate: 9600, autoOpen: true },
                err => {
                    if (err) console.log('Error: ', err.message)
                },
            )

            const parser = sp.pipe(new ReadlineParser({ delimiter: '\n' }))

            parser.on('data', chunk => {
                try {
                    const jumprun = parseSerialChunk(chunk)
                    onData(jumprun)
                } catch (error) {
                    console.error('Error parsing serial data:', error.message)
                }
            })

            sp.write('x')
        })
        .catch(err => {
            console.error('Error listing serial ports:', err.message)
        })
}
