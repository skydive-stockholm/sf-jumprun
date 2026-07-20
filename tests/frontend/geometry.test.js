import { describe, it, expect } from 'vitest'
import {
    normalizeAngle,
    angleDifference,
    clamp,
    getJumpRunEndpoints,
    calcJumpRunParams,
    calcShiftFromMidpoint,
    createCircleData,
    createLineData,
    createJumprunData,
    createDriftBoxData,
    createLeadLineData,
    getTextPosition,
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

describe('createCircleData', () => {
    it('returns a GeoJSON polygon for a given radius', () => {
        const geojson = createCircleData(0.5)
        expect(geojson.type).toBe('Feature')
        expect(geojson.geometry.type).toBe('Polygon')
    })
})

describe('createLineData', () => {
    it('returns GeoJSON LineString for x axis', () => {
        const geojson = createLineData('x')
        expect(geojson.geometry.type).toBe('LineString')
        expect(geojson.geometry.coordinates).toHaveLength(2)
    })

    it('returns GeoJSON LineString for y axis', () => {
        const geojson = createLineData('y')
        expect(geojson.geometry.type).toBe('LineString')
        expect(geojson.geometry.coordinates).toHaveLength(2)
    })
})

describe('createJumprunData', () => {
    it('returns a GeoJSON LineString with 5 coordinates', () => {
        const geojson = createJumprunData(-0.2, 0.2, 0, 30)
        expect(geojson.geometry.type).toBe('LineString')
        expect(geojson.geometry.coordinates).toHaveLength(5)
    })
})

describe('createDriftBoxData', () => {
    it('skips the green-light lead at the start of the run', () => {
        const drift = { distance: 0, bearing: 0, spread: 0.08 }
        const full = createDriftBoxData(-0.5, 0.5, 0, 90, drift)
        const withLead = createDriftBoxData(-0.5, 0.5, 0, 90, {
            ...drift,
            lead: 0.2,
        })

        const west = ring => Math.min(...ring.map(c => c[0]))
        const east = ring => Math.max(...ring.map(c => c[0]))
        const fullRing = full.geometry.coordinates[0]
        const leadRing = withLead.geometry.coordinates[0]

        expect(west(leadRing)).toBeGreaterThan(west(fullRing))
        expect(east(leadRing)).toBeCloseTo(east(fullRing), 6)
    })

    it('never starts past the end of the run', () => {
        const box = createDriftBoxData(-0.1, 0.1, 0, 90, {
            distance: 0,
            bearing: 0,
            spread: 0.08,
            lead: 1,
        })
        expect(box.geometry.type).toBe('Polygon')
    })
})

describe('createLeadLineData', () => {
    it('returns a segment from the run start along the heading', () => {
        const line = createLeadLineData(-0.5, 0.5, 0, 90, 0.2)
        const run = getJumpRunEndpoints(-0.5, 0.5, 0, 90)
        const [p1, p2] = line.geometry.coordinates
        expect(p1).toEqual(run.start)
        expect(p2[0]).toBeGreaterThan(p1[0])
        expect(p2[0]).toBeLessThan(run.end[0])
    })

    it('is clamped to the run and null when there is no lead', () => {
        const clamped = createLeadLineData(-0.1, 0.1, 0, 90, 5)
        const run = getJumpRunEndpoints(-0.1, 0.1, 0, 90)
        expect(clamped.geometry.coordinates[1][0]).toBeCloseTo(run.end[0], 6)
        expect(createLeadLineData(-0.5, 0.5, 0, 90, 0)).toBeNull()
    })
})

describe('getTextPosition', () => {
    it('returns [lng, lat] array', () => {
        const pos = getTextPosition(0, 0.5)
        expect(pos).toHaveLength(2)
        expect(typeof pos[0]).toBe('number')
        expect(typeof pos[1]).toBe('number')
    })
})
