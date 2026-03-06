import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { getJumpRunEndpoints } from '../../src/utils/geometry.js'

describe('drag handles reactivity', () => {
    it('Object.assign keeps reference alive after jumprun update', () => {
        const data = reactive({
            jumprun: { start: -0.2, end: 0.2, shift: 0, angle: 30 },
        })

        const jumprunRef = data.jumprun

        // This is the fix: Object.assign instead of reassignment
        Object.assign(data.jumprun, {
            start: -0.5,
            end: 0.5,
            shift: -0.12,
            angle: 50,
        })

        const refEndpoints = getJumpRunEndpoints(
            jumprunRef.start,
            jumprunRef.end,
            jumprunRef.shift,
            jumprunRef.angle,
        )

        const freshEndpoints = getJumpRunEndpoints(
            data.jumprun.start,
            data.jumprun.end,
            data.jumprun.shift,
            data.jumprun.angle,
        )

        // With Object.assign, both references see the same data
        expect(refEndpoints.start[0]).toBeCloseTo(freshEndpoints.start[0], 4)
        expect(refEndpoints.start[1]).toBeCloseTo(freshEndpoints.start[1], 4)
    })

    it('reassignment breaks the reference (documents the bug)', () => {
        const data = reactive({
            jumprun: { start: -0.2, end: 0.2, shift: 0, angle: 30 },
        })

        const jumprunRef = data.jumprun

        // Reassignment breaks the composable's reference
        data.jumprun = { start: -0.5, end: 0.5, shift: -0.12, angle: 50 }

        // jumprunRef still holds the old values
        expect(jumprunRef.start).toBe(-0.2)
        expect(data.jumprun.start).toBe(-0.5)
    })
})
