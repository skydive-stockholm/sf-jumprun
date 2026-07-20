// Automatic jump run suggestion based on winds aloft.
// Method combines https://skydivetheranch.com/learn-to-skydive-2/determining-exit-point/
// with the exit separation model from Steven Geens' APF Instructor A thesis
// "Exit Separation" (https://www.apf.com.au/ArticleDocuments/1411/exit-separation.pdf.aspx)
//  1. Jump run heading = direction of the speed-weighted average wind through
//     the column (flown into the wind)
//  2. Freefall drift  = average wind vector during freefall x freefall duration
//  3. Ideal exit      = freefall drift upwind of target (along-track and
//                       cross-track via shift), minus aircraft forward throw
//  4. Exit window     = how far a canopy can fly back to the target from
//                       opening altitude; asymmetric, longer on the upwind side
//  5. Green light     = turned on GREEN_LIGHT_LEAD seconds before first exit
//  6. Exit separation = required distance between groups divided by the
//                       relative groundspeed of plane and canopies

import { normalizeAngle, angleDifference, clamp } from './geometry.js'

export const SUGGESTION_DEFAULTS = {
    exitAltitude: 4000, // m
    openingAltitude: 1000, // m
    aircraftSpeedKt: 80, // kt airspeed on jump run
}

// Minimum change vs the set jump run before the suggestion is worth showing
export const SIGNIFICANCE_THRESHOLDS = {
    angle: 10, // degrees
    start: 0.2, // NM
    end: 0.2, // NM
    shift: 0.1, // NM
}

export const GREEN_LIGHT_LEAD = 10 // s of flight before the first exit point
export const MIN_RUN_LENGTH = 0.5 // NM
export const MAX_RUN_LENGTH = 1.5 // NM

const FREEFALL_SPEED = 55 // m/s terminal, vertical
const CANOPY_AIRSPEED = 13 // m/s average canopy airspeed
const CANOPY_DESCENT_RATE = 6.5 // m/s average with turns and braked flight
const OPENING_HEIGHT_LOSS = 150 // m lost to opening, checks and turning to the DZ
const MIN_GROUND_SPEED = 20 // m/s floor for the headwind correction
const FORWARD_THROW_TIME = 4 // s of ground speed carried over the exit
const CANOPY_MARGIN = 0.6 // use only part of the canopy range for the window
const METERS_PER_NM = 1852
const KT_TO_MS = 0.514444

// Required horizontal distance between groups at exit (tracking radii +
// 78 m canopy reaction buffer, per the Geens thesis)
const SEPARATION_DISTANCE_SMALL = 300 // m, groups under 4
const SEPARATION_DISTANCE_LARGE = 500 // m, groups of 4-10
const LOW_RELATIVE_SPEED = 15 // m/s, below this separation times get long
const MIN_RELATIVE_SPEED = 5 // m/s, below this no usable separation exists

const DRIFT_BOX_SPREAD = 150 // m of scatter around the drifted run (tracking radius)

const round2 = v => Math.round(v * 100) / 100
const toRad = deg => (deg * Math.PI) / 180

const toVec = (speed, direction) => {
    const rad = toRad(direction)
    return [speed * Math.cos(rad), speed * Math.sin(rad)]
}

const vecToWind = ([x, y]) => ({
    speed: Math.sqrt(x * x + y * y),
    direction: normalizeAngle((Math.atan2(y, x) * 180) / Math.PI),
})

// Headwind component of a wind for an aircraft tracking along heading
// (meteorological convention: direction is where the wind comes from).
const headwindComponent = (wind, heading) =>
    wind.speed * Math.cos(toRad(wind.direction - heading))

// Wind at an altitude, linearly interpolated between the sorted samples and
// clamped to the outermost ones.
function windAt(sorted, altitude) {
    if (altitude <= sorted[0].altitude) return sorted[0]
    const last = sorted[sorted.length - 1]
    if (altitude >= last.altitude) return last

    for (let i = 0; i < sorted.length - 1; i++) {
        const lo = sorted[i]
        const hi = sorted[i + 1]
        if (altitude >= lo.altitude && altitude <= hi.altitude) {
            const t = (altitude - lo.altitude) / (hi.altitude - lo.altitude)
            const [x1, y1] = toVec(lo.speed, lo.direction)
            const [x2, y2] = toVec(hi.speed, hi.direction)
            return {
                altitude,
                ...vecToWind([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]),
            }
        }
    }
    return last
}

// Average wind vector over an altitude band, sampled every 100 m.
function averageWind(sorted, fromAlt, toAlt) {
    let x = 0
    let y = 0
    let n = 0
    for (let alt = fromAlt; alt <= toAlt; alt += 100) {
        const w = windAt(sorted, alt)
        const [dx, dy] = toVec(w.speed, w.direction)
        x += dx
        y += dy
        n++
    }
    if (n === 0) return { speed: 0, direction: 0 }
    return vecToWind([x / n, y / n])
}

function parseSamples(windsAloft, groundWind) {
    if (!Array.isArray(windsAloft) || windsAloft.length === 0) return null

    const samples = windsAloft
        .filter(
            w =>
                w &&
                Number.isFinite(w.wind) &&
                w.windDegrees != null &&
                w.windDegrees !== '' &&
                Number.isFinite(Number(w.windDegrees)),
        )
        .map(w => ({
            altitude: w.altitude,
            speed: w.wind,
            direction: Number(w.windDegrees),
        }))
    if (samples.length === 0) return null

    if (groundWind && Number.isFinite(groundWind.speed)) {
        samples.push({
            altitude: 0,
            speed: groundWind.speed,
            direction: Number(groundWind.direction) || 0,
        })
    }

    samples.sort((a, b) => a.altitude - b.altitude)
    return samples
}

/**
 * Calculate a suggested jump run from winds aloft.
 *
 * @param {Array} windsAloft entries with { altitude (m), wind (m/s), windDegrees }
 * @param {Object} [groundWind] optional { speed (m/s), direction (degrees) }
 * @param {Object} [options] overrides for SUGGESTION_DEFAULTS
 * @returns {Object|null} { angle, start, end, shift } in degrees/NM, or null
 */
export function calculateJumpRunSuggestion(windsAloft, groundWind, options) {
    const { exitAltitude, openingAltitude, aircraftSpeedKt } = {
        ...SUGGESTION_DEFAULTS,
        ...options,
    }

    const samples = parseSamples(windsAloft, groundWind)
    if (!samples) return null

    // Speed-weighted heading: strong uppers dominate, a light ground breeze
    // barely moves it.
    const meanWind = averageWind(samples, 0, exitAltitude)
    if (meanWind.speed === 0) return null
    const heading = meanWind.direction

    const freefallWind = averageWind(samples, openingAltitude, exitAltitude)
    const freefallTime = (exitAltitude - openingAltitude) / FREEFALL_SPEED
    const freefallDrift = freefallWind.speed * freefallTime

    const groundSpeed = Math.max(
        aircraftSpeedKt * KT_TO_MS -
            headwindComponent(windAt(samples, exitAltitude), heading),
        MIN_GROUND_SPEED,
    )
    const forwardThrow = groundSpeed * FORWARD_THROW_TIME

    // The drift vector rarely points exactly along the averaged heading;
    // its cross-track component becomes the run's lateral shift.
    const diffRad = toRad(freefallWind.direction - heading)
    const alongM = freefallDrift * Math.cos(diffRad) - forwardThrow
    const shiftM = freefallDrift * Math.sin(diffRad)

    const idealExitNM = alongM / METERS_PER_NM

    // Reachability window: from where can a canopy still make the target?
    // Flying back downwind is fast, crawling home against the wind is slow,
    // so the window extends further on the upwind (end) side of the exit.
    const canopyWind = averageWind(samples, 0, openingAltitude)
    const canopyHeadwind = headwindComponent(canopyWind, heading)
    const canopyTime =
        Math.max(openingAltitude - OPENING_HEIGHT_LOSS, 0) / CANOPY_DESCENT_RATE
    let downwindM =
        Math.max(CANOPY_AIRSPEED - canopyHeadwind, 0) *
        canopyTime *
        CANOPY_MARGIN
    let upwindM =
        Math.max(CANOPY_AIRSPEED + canopyHeadwind, 0) *
        canopyTime *
        CANOPY_MARGIN

    const totalM = downwindM + upwindM
    const minM = MIN_RUN_LENGTH * METERS_PER_NM
    const maxM = MAX_RUN_LENGTH * METERS_PER_NM
    if (totalM <= 0) {
        downwindM = minM / 2
        upwindM = minM / 2
    } else {
        const scale = clamp(totalM, minM, maxM) / totalM
        downwindM *= scale
        upwindM *= scale
    }

    const greenLightLeadNM = (groundSpeed * GREEN_LIGHT_LEAD) / METERS_PER_NM

    return {
        angle: Math.round(heading),
        start: round2(
            idealExitNM - downwindM / METERS_PER_NM - greenLightLeadNM,
        ),
        end: round2(idealExitNM + upwindM / METERS_PER_NM),
        shift: clamp(round2(shiftM / METERS_PER_NM), -0.5, 0.5),
    }
}

/**
 * Calculate the area from which a canopy can still make it back to the
 * target after opening: a circle of radius (canopy airspeed x time under
 * canopy) whose center sits that much wind drift upwind of the target.
 * Uses the same safety margin as the exit window so the two stay coherent.
 *
 * @param {Array} windsAloft entries with { altitude (m), wind (m/s), windDegrees }
 * @param {Object} [groundWind] optional { speed (m/s), direction (degrees) }
 * @param {Object} [options] overrides for SUGGESTION_DEFAULTS
 * @returns {Object|null} { radius, offset } in NM and { bearing } in degrees
 *          (direction from the target to the circle center, i.e. upwind)
 */
export function calculateCanopyCircle(windsAloft, groundWind, options) {
    const { openingAltitude } = {
        ...SUGGESTION_DEFAULTS,
        ...options,
    }

    const samples = parseSamples(windsAloft, groundWind)
    if (!samples) return null

    const canopyWind = averageWind(samples, 0, openingAltitude)
    const effectiveTime =
        (Math.max(openingAltitude - OPENING_HEIGHT_LOSS, 0) /
            CANOPY_DESCENT_RATE) *
        CANOPY_MARGIN
    if (effectiveTime <= 0) return null

    return {
        radius: round2((CANOPY_AIRSPEED * effectiveTime) / METERS_PER_NM),
        offset: round2((canopyWind.speed * effectiveTime) / METERS_PER_NM),
        bearing: Math.round(canopyWind.direction),
    }
}

/**
 * Calculate where jumpers travel between exit and opening: the freefall
 * wind drift plus the aircraft's forward throw. Translating the jump run
 * by this vector gives the drift box — the area where canopies open.
 *
 * @param {Array} windsAloft entries with { altitude (m), wind (m/s), windDegrees }
 * @param {Object} [groundWind] optional { speed (m/s), direction (degrees) }
 * @param {number} heading jump run heading in degrees (direction of flight)
 * @param {Object} [options] overrides for SUGGESTION_DEFAULTS
 * @returns {Object|null} { distance, spread, lead } in NM and { bearing } in
 *          degrees (direction of travel from exit to opening point); lead is
 *          the run flown during the green-light lead, before the first exit
 */
export function calculateFreefallDrift(
    windsAloft,
    groundWind,
    heading,
    options,
) {
    const { exitAltitude, openingAltitude, aircraftSpeedKt } = {
        ...SUGGESTION_DEFAULTS,
        ...options,
    }

    const track = Number(heading)
    if (!Number.isFinite(track)) return null

    const samples = parseSamples(windsAloft, groundWind)
    if (!samples) return null

    const freefallWind = averageWind(samples, openingAltitude, exitAltitude)
    const freefallTime = (exitAltitude - openingAltitude) / FREEFALL_SPEED

    const groundSpeed = Math.max(
        aircraftSpeedKt * KT_TO_MS -
            headwindComponent(windAt(samples, exitAltitude), track),
        MIN_GROUND_SPEED,
    )

    // The wind carries jumpers downwind while the forward throw carries
    // them along the run; the opening point is the sum of the two.
    const [dx, dy] = toVec(
        freefallWind.speed * freefallTime,
        freefallWind.direction + 180,
    )
    const [tx, ty] = toVec(groundSpeed * FORWARD_THROW_TIME, track)
    const travel = vecToWind([dx + tx, dy + ty])

    return {
        distance: round2(travel.speed / METERS_PER_NM),
        bearing: Math.round(travel.direction),
        spread: round2(DRIFT_BOX_SPREAD / METERS_PER_NM),
        lead: round2((groundSpeed * GREEN_LIGHT_LEAD) / METERS_PER_NM),
    }
}

/**
 * Calculate the required time between group exits for a given jump run
 * heading, per t = D / (plane groundspeed - canopy groundspeed).
 *
 * @param {Array} windsAloft entries with { altitude (m), wind (m/s), windDegrees }
 * @param {Object} [groundWind] optional { speed (m/s), direction (degrees) }
 * @param {number} heading jump run heading in degrees (direction of flight)
 * @param {Object} [options] overrides for SUGGESTION_DEFAULTS
 * @returns {Object|null} groundspeeds in m/s, separation times in whole
 *          seconds (null when no usable separation exists) and a warning
 *          level (null | 'low' | 'critical')
 */
export function calculateExitSeparation(
    windsAloft,
    groundWind,
    heading,
    options,
) {
    const { exitAltitude, openingAltitude, aircraftSpeedKt } = {
        ...SUGGESTION_DEFAULTS,
        ...options,
    }

    const track = Number(heading)
    if (!Number.isFinite(track)) return null

    const samples = parseSamples(windsAloft, groundWind)
    if (!samples) return null

    const planeGroundSpeed =
        aircraftSpeedKt * KT_TO_MS -
        headwindComponent(windAt(samples, exitAltitude), track)

    // The critical canopy is the one from the previous group flying along
    // the run toward the next group's opening point.
    const canopyGroundSpeed =
        CANOPY_AIRSPEED -
        headwindComponent(windAt(samples, openingAltitude), track)

    const relativeSpeed = planeGroundSpeed - canopyGroundSpeed

    const time = distance =>
        relativeSpeed > MIN_RELATIVE_SPEED
            ? Math.ceil(distance / relativeSpeed)
            : null

    return {
        planeGroundSpeed: Math.round(planeGroundSpeed),
        canopyGroundSpeed: Math.round(canopyGroundSpeed),
        relativeSpeed: Math.round(relativeSpeed),
        smallGroups: time(SEPARATION_DISTANCE_SMALL),
        largeGroups: time(SEPARATION_DISTANCE_LARGE),
        warning:
            relativeSpeed <= MIN_RELATIVE_SPEED
                ? 'critical'
                : relativeSpeed < LOW_RELATIVE_SPEED
                ? 'low'
                : null,
    }
}

/**
 * Whether a suggestion differs enough from the currently set jump run to be
 * worth showing.
 *
 * @param {Object} suggestion { angle, start, end, shift }
 * @param {Object} current currently set jump run with the same shape
 * @returns {boolean}
 */
export function isSignificantlyDifferent(suggestion, current) {
    if (!suggestion) return false
    if (!current) return true

    const angle = Number(current.angle)
    const start = Number(current.start)
    const end = Number(current.end)
    const shift = Number(current.shift)
    if (![angle, start, end, shift].every(Number.isFinite)) return true

    const t = SIGNIFICANCE_THRESHOLDS
    return (
        Math.abs(angleDifference(suggestion.angle, angle)) >= t.angle ||
        Math.abs(suggestion.start - start) >= t.start ||
        Math.abs(suggestion.end - end) >= t.end ||
        Math.abs(suggestion.shift - shift) >= t.shift
    )
}
