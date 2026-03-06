import { describe, it, expect } from 'vitest'
import { normalizeAngle, angleDifference, clamp } from '../../src/utils/geometry.js'

describe('normalizeAngle', () => {
    it('returns angle within 0-360 for positive input', () => {
        expect(normalizeAngle(90)).toBe(90)
    })

    it('normalizes negative angles', () => {
        expect(normalizeAngle(-90)).toBe(270)
    })

    it('normalizes angles over 360', () => {
        expect(normalizeAngle(450)).toBe(90)
    })

    it('returns 0 for 0', () => {
        expect(normalizeAngle(0)).toBe(0)
    })

    it('returns 0 for 360', () => {
        expect(normalizeAngle(360)).toBe(0)
    })
})

describe('angleDifference', () => {
    it('returns 0 for equal angles', () => {
        expect(angleDifference(90, 90)).toBe(0)
    })

    it('returns positive for clockwise difference', () => {
        expect(angleDifference(100, 90)).toBe(10)
    })

    it('wraps around 360 boundary', () => {
        expect(angleDifference(10, 350)).toBe(20)
    })

    it('wraps the other direction', () => {
        expect(angleDifference(350, 10)).toBe(-20)
    })
})

describe('clamp', () => {
    it('returns value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5)
    })

    it('clamps to min', () => {
        expect(clamp(-1, 0, 10)).toBe(0)
    })

    it('clamps to max', () => {
        expect(clamp(11, 0, 10)).toBe(10)
    })
})
