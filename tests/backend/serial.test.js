import { describe, it, expect } from 'vitest'
import { parseSerialChunk } from '../../backend/serial.js'

describe('parseSerialChunk', () => {
    it('parses hardware format into jumprun params', () => {
        const chunk = '{start:410 end:-410 shift:0 angle:180}'
        const result = parseSerialChunk(chunk)

        expect(result.start).toBeCloseTo(410 / 2048, 4)
        expect(result.end).toBeCloseTo(-410 / 2048, 4)
        expect(result.shift).toBeCloseTo(0 / 4096, 4)
        expect(result.angle).toBe(180)
    })

    it('handles negative shift values', () => {
        const chunk = '{start:100 end:200 shift:-500 angle:90}'
        const result = parseSerialChunk(chunk)

        expect(result.shift).toBeCloseTo(-500 / 4096, 4)
    })

    it('throws on invalid input', () => {
        expect(() => parseSerialChunk('garbage')).toThrow()
    })
})
