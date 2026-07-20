import { describe, it, expect } from 'vitest'
import {
    calculateJumpRunSuggestion,
    calculateExitSeparation,
    calculateCanopyCircle,
    calculateFreefallDrift,
    isSignificantlyDifferent,
} from '../../src/utils/jumprunSuggestion.js'

// 100 kt = 50 m/s in the thesis' rounded examples
const THESIS_AIRSPEED_KT = 50 / 0.514444

const uniformWind = (speed, degrees) => [
    { altitude: 600, wind: speed, windDegrees: degrees },
    { altitude: 1500, wind: speed, windDegrees: degrees },
    { altitude: 3000, wind: speed, windDegrees: degrees },
]

describe('calculateJumpRunSuggestion', () => {
    it('returns null without usable wind data', () => {
        expect(calculateJumpRunSuggestion([], null)).toBeNull()
        expect(
            calculateJumpRunSuggestion([{ altitude: 600, wind: NaN }], null),
        ).toBeNull()
    })

    it('returns only the jump run fields', () => {
        const s = calculateJumpRunSuggestion(uniformWind(10, 90), null)
        expect(Object.keys(s).sort()).toEqual([
            'angle',
            'end',
            'shift',
            'start',
        ])
    })

    it('flies into a uniform wind', () => {
        const s = calculateJumpRunSuggestion(uniformWind(10, 90), null)
        expect(s.angle).toBe(90)
        expect(s.shift).toBe(0)
    })

    it('weights the heading by wind speed', () => {
        // 2 m/s from the east near the ground, 20 m/s from the west aloft:
        // the strong uppers must dominate the run direction.
        const s = calculateJumpRunSuggestion(
            [
                { altitude: 600, wind: 2, windDegrees: 90 },
                { altitude: 3000, wind: 20, windDegrees: 270 },
            ],
            null,
        )
        expect(s.angle).toBe(270)
    })

    it('extends the exit window further on the upwind side', () => {
        // 10 m/s uniform wind, defaults (4000 m exit, 1000 m opening, 80 kt):
        // drift 545 m - throw 125 m = ideal exit 0.23 NM; canopy window
        // (13-10) vs (13+10) m/s over 131 s with 0.6 margin.
        const s = calculateJumpRunSuggestion(uniformWind(10, 90), null)
        expect(s.end).toBeCloseTo(1.2, 2)
        expect(s.start).toBeCloseTo(-0.07, 2)
    })

    it('keeps a long run on a near-nil wind day', () => {
        // Canopies can fly ~1 km back in either direction, so calm days give
        // the longest usable run instead of collapsing to the minimum.
        const s = calculateJumpRunSuggestion(uniformWind(0.5, 90), null)
        expect(s.end - s.start).toBeGreaterThan(1)
    })

    it('ignores crosswind when reducing aircraft groundspeed', () => {
        // Same wind speed, once on the nose and once as pure crosswind: the
        // headwind run gets a shorter green-light lead, so a later start
        // relative to its exit window is not comparable directly — instead
        // check via separation groundspeeds below.
        const head = calculateExitSeparation(uniformWind(10, 90), null, 90)
        const cross = calculateExitSeparation(uniformWind(10, 90), null, 0)
        expect(cross.planeGroundSpeed - head.planeGroundSpeed).toBe(10)
    })
})

describe('calculateExitSeparation', () => {
    it('matches thesis example A (normal day)', () => {
        // Wind 10 m/s East at exit, 5 m/s East at opening, run-in East:
        // plane 40 m/s, canopy 8 m/s, relative 32 m/s.
        const s = calculateExitSeparation(
            [
                { altitude: 1000, wind: 5, windDegrees: 90 },
                { altitude: 4000, wind: 10, windDegrees: 90 },
            ],
            null,
            90,
            { aircraftSpeedKt: THESIS_AIRSPEED_KT },
        )
        expect(s.planeGroundSpeed).toBe(40)
        expect(s.canopyGroundSpeed).toBe(8)
        expect(s.relativeSpeed).toBe(32)
        expect(s.smallGroups).toBe(10)
        expect(s.largeGroups).toBe(16)
        expect(s.warning).toBeNull()
    })

    it('matches thesis example D (opposing upper and lower winds)', () => {
        // Uppers 20 m/s West, lowers 10 m/s East, run-in West: canopies chase
        // the plane at 23 m/s groundspeed and separation collapses.
        const s = calculateExitSeparation(
            [
                { altitude: 1000, wind: 10, windDegrees: 90 },
                { altitude: 4000, wind: 20, windDegrees: 270 },
            ],
            null,
            270,
            { aircraftSpeedKt: THESIS_AIRSPEED_KT },
        )
        expect(s.planeGroundSpeed).toBe(30)
        expect(s.canopyGroundSpeed).toBe(23)
        expect(s.relativeSpeed).toBe(7)
        expect(s.smallGroups).toBe(43)
        expect(s.warning).toBe('low')
    })

    it('flags a critical situation with no usable separation', () => {
        const s = calculateExitSeparation(
            [
                { altitude: 1000, wind: 3, windDegrees: 270 },
                { altitude: 4000, wind: 45, windDegrees: 270 },
            ],
            null,
            270,
            { aircraftSpeedKt: THESIS_AIRSPEED_KT },
        )
        expect(s.relativeSpeed).toBe(-5)
        expect(s.smallGroups).toBeNull()
        expect(s.largeGroups).toBeNull()
        expect(s.warning).toBe('critical')
    })

    it('returns null without a heading or wind data', () => {
        expect(calculateExitSeparation([], null, 90)).toBeNull()
        expect(
            calculateExitSeparation(uniformWind(5, 90), null, 'abc'),
        ).toBeNull()
    })
})

describe('calculateCanopyCircle', () => {
    it('offsets the circle upwind by the drift under canopy', () => {
        // 10 m/s from the east, defaults: 78.5 s effective canopy time gives
        // a 1020 m radius circle centered 785 m towards the east (090).
        const c = calculateCanopyCircle(uniformWind(10, 90), null)
        expect(c.radius).toBeCloseTo(0.55, 2)
        expect(c.offset).toBeCloseTo(0.42, 2)
        expect(c.bearing).toBe(90)
    })

    it('centers the circle on the target in near-nil wind', () => {
        const c = calculateCanopyCircle(uniformWind(0.5, 90), null)
        expect(c.radius).toBeCloseTo(0.55, 2)
        expect(c.offset).toBeLessThan(0.03)
    })

    it('spans the same along-track band as the exit window', () => {
        // The circle's extent along the run from the target must equal the
        // exit window's canopy extents: (13 -/+ wind) x time.
        const c = calculateCanopyCircle(uniformWind(10, 90), null)
        expect(c.radius - c.offset).toBeCloseTo(0.13, 2) // downwind side
        expect(c.radius + c.offset).toBeCloseTo(0.97, 2) // upwind side
    })

    it('returns null without wind data', () => {
        expect(calculateCanopyCircle([], null)).toBeNull()
    })
})

describe('calculateFreefallDrift', () => {
    it('combines downwind drift with forward throw', () => {
        // 10 m/s from the east, run-in east: 545 m of drift west minus
        // 125 m of forward throw east leaves 0.23 NM of travel due west —
        // the same offset the suggestion uses for its ideal exit point.
        const d = calculateFreefallDrift(uniformWind(10, 90), null, 90)
        expect(d.bearing).toBe(270)
        expect(d.distance).toBeCloseTo(0.23, 2)
        expect(d.spread).toBeCloseTo(0.08, 2)
    })

    it('is pure forward throw on a nil-wind day', () => {
        // No wind: only the ~165 m throw along the run remains.
        const d = calculateFreefallDrift(uniformWind(0, 90), null, 90)
        expect(d.bearing).toBe(90)
        expect(d.distance).toBeCloseTo(0.09, 2)
    })

    it('reports the run flown during the green-light lead', () => {
        // No wind: 80 kt = 41.2 m/s ground speed x 10 s lead = 0.22 NM.
        // A 10 m/s headwind slows the plane and shortens the lead.
        expect(calculateFreefallDrift(uniformWind(0, 90), null, 90).lead).toBe(
            0.22,
        )
        expect(calculateFreefallDrift(uniformWind(10, 90), null, 90).lead).toBe(
            0.17,
        )
    })

    it('drifts sideways in a pure crosswind', () => {
        // Wind from the north, run-in east: the box lands south of the run
        // and slightly ahead of it from the throw.
        const d = calculateFreefallDrift(uniformWind(10, 0), null, 90)
        expect(d.bearing).toBeGreaterThan(90)
        expect(d.bearing).toBeLessThan(180)
        expect(d.distance).toBeGreaterThan(0.25)
    })

    it('returns null without wind data or a heading', () => {
        expect(calculateFreefallDrift([], null, 90)).toBeNull()
        expect(
            calculateFreefallDrift(uniformWind(5, 90), null, 'abc'),
        ).toBeNull()
    })
})

describe('isSignificantlyDifferent', () => {
    it('is false for a matching run and true for a rotated one', () => {
        const suggestion = { angle: 90, start: -0.5, end: 0.5, shift: 0 }
        expect(isSignificantlyDifferent(suggestion, { ...suggestion })).toBe(
            false,
        )
        expect(
            isSignificantlyDifferent(suggestion, {
                ...suggestion,
                angle: 120,
            }),
        ).toBe(true)
    })
})
