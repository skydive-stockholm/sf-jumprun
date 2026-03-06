import { describe, it, expect } from 'vitest'
import { windDirection, roundNumber } from '../../src/utils/weather.js'

describe('windDirection', () => {
    it('returns N for 0 degrees', () => {
        expect(windDirection(0).name).toBe('N')
    })

    it('returns N for 360 (wraps)', () => {
        expect(windDirection(360).name).toBe('N')
    })

    it('returns E for 90', () => {
        expect(windDirection(90).name).toBe('E')
    })

    it('returns S for 180', () => {
        expect(windDirection(180).name).toBe('S')
    })

    it('returns W for 270', () => {
        expect(windDirection(270).name).toBe('W')
    })

    it('returns NE for 45', () => {
        expect(windDirection(45).name).toBe('NE')
    })

    it('returns NNW for 330', () => {
        expect(windDirection(330).name).toBe('NNW')
    })

    it('handles boundary at 11.25 (NNE starts)', () => {
        expect(windDirection(11.25).name).toBe('NNE')
    })

    it('handles just below boundary (still N)', () => {
        expect(windDirection(11.24).name).toBe('N')
    })
})

describe('roundNumber', () => {
    it('rounds to one decimal', () => {
        expect(roundNumber(3.14159)).toBe(3.1)
    })

    it('keeps clean numbers', () => {
        expect(roundNumber(5.0)).toBe(5)
    })

    it('rounds 0.55 to 0.6', () => {
        expect(roundNumber(0.55)).toBe(0.6)
    })
})
