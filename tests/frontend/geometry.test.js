import { describe, it, expect } from 'vitest'
import {
    normalizeAngle,
    angleDifference,
    clamp,
    getJumpRunEndpoints,
    calcJumpRunParams,
    calcShiftFromMidpoint,
} from '../../src/utils/geometry.js'
import coordinates from '../../src/data/coordinates.js'

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

describe('getJumpRunEndpoints', () => {
    it('returns start, end, and mid coordinates', () => {
        const result = getJumpRunEndpoints(-0.2, 0.2, 0, 30)
        expect(result).toHaveProperty('start')
        expect(result).toHaveProperty('end')
        expect(result).toHaveProperty('mid')
        expect(result.start).toHaveLength(2)
        expect(result.end).toHaveLength(2)
        expect(result.mid).toHaveLength(2)
    })

    it('mid is between start and end', () => {
        const result = getJumpRunEndpoints(-0.5, 0.5, 0, 90)
        const midLng = (result.start[0] + result.end[0]) / 2
        const midLat = (result.start[1] + result.end[1]) / 2
        expect(result.mid[0]).toBeCloseTo(midLng, 4)
        expect(result.mid[1]).toBeCloseTo(midLat, 4)
    })

    it('shift moves both endpoints perpendicular to angle', () => {
        const noShift = getJumpRunEndpoints(-0.2, 0.2, 0, 0)
        const withShift = getJumpRunEndpoints(-0.2, 0.2, 0.1, 0)
        expect(withShift.start[0]).not.toBeCloseTo(noShift.start[0], 3)
        expect(withShift.end[0]).not.toBeCloseTo(noShift.end[0], 3)
    })
})

describe('calcJumpRunParams', () => {
    it('round-trips through getJumpRunEndpoints', () => {
        const original = { start: -0.3, end: 0.5, shift: 0.1, angle: 45 }
        const endpoints = getJumpRunEndpoints(
            original.start, original.end, original.shift, original.angle,
        )
        const result = calcJumpRunParams(endpoints.start, endpoints.end, original.angle)
        expect(result.angle).toBe(original.angle)
        expect(result.start).toBeCloseTo(original.start, 1)
        expect(result.end).toBeCloseTo(original.end, 1)
    })

    it('uses fallback angle when points are too close', () => {
        const p = [17.42929, 60.28519]
        const result = calcJumpRunParams(p, p, 120)
        expect(result.angle).toBe(120)
    })

    it('clamps values to valid ranges', () => {
        const far = getJumpRunEndpoints(-5, 5, 0, 0)
        const result = calcJumpRunParams(far.start, far.end, 0)
        expect(result.start).toBeGreaterThanOrEqual(-4)
        expect(result.end).toBeLessThanOrEqual(4)
    })
})

describe('calcShiftFromMidpoint', () => {
    it('returns 0 when midpoint is at center', () => {
        const center = coordinates.mapCenter
        expect(calcShiftFromMidpoint(center, 0)).toBe(0)
    })

    it('detects perpendicular offset', () => {
        const endpoints = getJumpRunEndpoints(-0.2, 0.2, 0.2, 90)
        const shift = calcShiftFromMidpoint(endpoints.mid, 90)
        expect(shift).toBeCloseTo(0.2, 1)
    })
})
