import turfCircle from '@turf/circle'
import coordinates from '../data/coordinates.js'
import * as turf from '@turf/turf'

export const createCircleData = nauticalMiles => {
    return createCircle(nauticalMiles)
}

export const createLineData = direction => {
    let sourceCoordinates = []

    if (direction === 'x') {
        sourceCoordinates = [
            [coordinates.mapCenter[0] + 0.047, coordinates.mapCenter[1]],
            [coordinates.mapCenter[0] - 0.047, coordinates.mapCenter[1]],
        ]
    }

    if (direction === 'y') {
        sourceCoordinates = [
            [coordinates.mapCenter[0], coordinates.mapCenter[1] + 0.0233],
            [coordinates.mapCenter[0], coordinates.mapCenter[1] - 0.0233],
        ]
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: sourceCoordinates,
        },
    }
}

export const createJumprunData = (start, end, shift, angle) => {
    return jrHelper(start, end, shift, angle)
}

export const getTextPosition = (angle, distance) => {
    const point = turf.point(coordinates.mapCenter)
    const destination = turf.destination(point, distance, angle, {
        units: 'nauticalmiles',
    })
    return destination.geometry.coordinates
}

const jrHelper = (start, end, shift, angle) => {
    const p1 = turf.transformTranslate(
        turf.point(coordinates.mapCenter),
        start * 1852,
        angle,
        { units: 'meters' },
    )
    const p2 = turf.transformTranslate(
        turf.point(coordinates.mapCenter),
        end * 1852,
        angle,
        { units: 'meters' },
    )
    const p3 = turf.transformTranslate(p2, 100, angle + 150, {
        units: 'meters',
    })
    const p4 = turf.transformTranslate(p3, 100, angle - 90, { units: 'meters' })
    const jr = turf.lineString(
        [
            p1.geometry.coordinates,
            p2.geometry.coordinates,
            p3.geometry.coordinates,
            p4.geometry.coordinates,
            p2.geometry.coordinates,
        ],
        { name: 'line 2' },
    )

    return turf.transformTranslate(jr, shift * 1852, angle + 90, {
        units: 'meters',
    })
}

const createCircle = (nauticalMiles = 0.1) => {
    const radius = nauticalMiles * 1852 // nautical miles in meters
    const options = { steps: 0, units: 'meters' }

    return turfCircle(coordinates.mapCenter, radius, options)
}

// Circle displaced from the map center, e.g. the canopy return area
// offset upwind of the target.
export const createOffsetCircleData = (radiusNM, offsetNM, bearing) => {
    const center = turf.destination(
        turf.point(coordinates.mapCenter),
        offsetNM,
        bearing,
        { units: 'nauticalmiles' },
    )
    return turfCircle(center.geometry.coordinates, radiusNM * 1852, {
        steps: 64,
        units: 'meters',
    })
}

// Box where jumpers open after freefall: the jump run from the first exit
// point (the green-light lead is skipped) translated by the freefall drift
// vector and padded on all sides by the expected scatter.
export const createDriftBoxData = (start, end, shift, angle, drift) => {
    const leadNM = clamp(drift.lead || 0, 0, end - start)
    const { start: p1, end: p2 } = getJumpRunEndpoints(
        start + leadNM,
        end,
        shift,
        angle,
    )
    const padM = drift.spread * 1852
    const translate = (pt, distance, bearing) =>
        turf.transformTranslate(pt, distance, bearing, { units: 'meters' })

    const move = coords =>
        translate(turf.point(coords), drift.distance * 1852, drift.bearing)
    const a = translate(move(p1), padM, angle + 180)
    const b = translate(move(p2), padM, angle)
    const corner = (pt, side) =>
        translate(pt, padM, angle + side).geometry.coordinates

    return turf.polygon([
        [
            corner(a, -90),
            corner(b, -90),
            corner(b, 90),
            corner(a, 90),
            corner(a, -90),
        ],
    ])
}

// Green-light lead: the first part of the run, flown before the first exit.
export const createLeadLineData = (start, end, shift, angle, leadNM) => {
    const lead = clamp(leadNM || 0, 0, end - start)
    if (lead <= 0) return null

    const { start: p1, end: p2 } = getJumpRunEndpoints(
        start,
        start + lead,
        shift,
        angle,
    )
    return turf.lineString([p1, p2])
}

export function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360
}

export function angleDifference(a, b) {
    let diff = a - b
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    return diff
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
}

export function getJumpRunEndpoints(start, end, shift, angle) {
    const center = turf.point(coordinates.mapCenter)

    let p1 = turf.transformTranslate(center, start * 1852, angle, {
        units: 'meters',
    })
    let p2 = turf.transformTranslate(center, end * 1852, angle, {
        units: 'meters',
    })

    if (shift !== 0) {
        p1 = turf.transformTranslate(p1, shift * 1852, angle + 90, {
            units: 'meters',
        })
        p2 = turf.transformTranslate(p2, shift * 1852, angle + 90, {
            units: 'meters',
        })
    }

    return {
        start: p1.geometry.coordinates,
        end: p2.geometry.coordinates,
        mid: turf.midpoint(p1, p2).geometry.coordinates,
    }
}

export function calcJumpRunParams(startCoords, endCoords, fallbackAngle) {
    const center = turf.point(coordinates.mapCenter)
    const startPt = turf.point(startCoords)
    const endPt = turf.point(endCoords)

    const lineDist = turf.distance(startPt, endPt, {
        units: 'nauticalmiles',
    })

    let angle
    if (lineDist < 0.01) {
        angle = fallbackAngle || 0
    } else {
        angle = normalizeAngle(turf.bearing(startPt, endPt))
    }

    let start = 0,
        end = 0,
        shift = 0

    const distToStart = turf.distance(center, startPt, {
        units: 'nauticalmiles',
    })
    if (distToStart > 0.001) {
        const bearingToStart = turf.bearing(center, startPt)
        const diffRad = (angleDifference(bearingToStart, angle) * Math.PI) / 180
        start = distToStart * Math.cos(diffRad)
        shift = distToStart * Math.sin(diffRad)
    }

    const distToEnd = turf.distance(center, endPt, {
        units: 'nauticalmiles',
    })
    if (distToEnd > 0.001) {
        const bearingToEnd = turf.bearing(center, endPt)
        const diffRad = (angleDifference(bearingToEnd, angle) * Math.PI) / 180
        end = distToEnd * Math.cos(diffRad)
    }

    return {
        angle: Math.round(angle),
        start: clamp(Math.round(start * 100) / 100, -4, 4),
        end: clamp(Math.round(end * 100) / 100, -4, 4),
        shift: clamp(Math.round(shift * 100) / 100, -0.5, 0.5),
    }
}

export function calcShiftFromMidpoint(midCoords, angle) {
    const center = turf.point(coordinates.mapCenter)
    const midPt = turf.point(midCoords)

    const dist = turf.distance(center, midPt, { units: 'nauticalmiles' })
    if (dist < 0.001) return 0

    const bearing = turf.bearing(center, midPt)
    const diffRad = (angleDifference(bearing, angle) * Math.PI) / 180

    return clamp(Math.round(dist * Math.sin(diffRad) * 100) / 100, -0.5, 0.5)
}
