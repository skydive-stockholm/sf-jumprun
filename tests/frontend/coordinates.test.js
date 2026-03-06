import { describe, it, expect } from 'vitest'

describe('coordinates', () => {
    it('mapCenter is an array of two numbers', async () => {
        const mod = await import('../../src/data/coordinates.js')
        expect(mod.default.mapCenter).toHaveLength(2)
        expect(typeof mod.default.mapCenter[0]).toBe('number')
        expect(typeof mod.default.mapCenter[1]).toBe('number')
    })

    it('mapCenter values are valid lng/lat', async () => {
        const mod = await import('../../src/data/coordinates.js')
        const [lng, lat] = mod.default.mapCenter
        expect(lng).toBeGreaterThan(-180)
        expect(lng).toBeLessThan(180)
        expect(lat).toBeGreaterThan(-90)
        expect(lat).toBeLessThan(90)
    })
})
