import { describe, it, expect } from 'vitest'
import { sanitizeStorage } from '../../backend/utils/sanitize.js'

describe('sanitizeStorage', () => {
    it('sanitizes staff fields to strings', () => {
        const result = sanitizeStorage({
            staff: { manifestor: 123, jumpLeader: null, pilot: 'Alice' },
        })
        expect(result.staff).toEqual({
            manifestor: '123',
            jumpLeader: '',
            pilot: 'Alice',
        })
    })

    it('sanitizes jumprun fields to numbers', () => {
        const result = sanitizeStorage({
            jumprun: { start: '0.5', end: 'abc', shift: 0.1, angle: 90 },
        })
        expect(result.jumprun).toEqual({
            start: 0.5,
            end: 0,
            shift: 0.1,
            angle: 90,
        })
    })

    it('returns empty object for empty input', () => {
        expect(sanitizeStorage({})).toEqual({})
    })

    it('ignores unknown fields', () => {
        const result = sanitizeStorage({ hacker: 'drop table' })
        expect(result).toEqual({})
    })

    it('handles both staff and jumprun together', () => {
        const result = sanitizeStorage({
            staff: { manifestor: 'A', jumpLeader: 'B', pilot: 'C' },
            jumprun: { start: -0.2, end: 0.2, shift: 0, angle: 30 },
        })
        expect(result.staff).toBeDefined()
        expect(result.jumprun).toBeDefined()
    })

    it('sanitizes manual winds aloft to numbers per known altitude', () => {
        const result = sanitizeStorage({
            settings: {
                manualWindsAloft: {
                    600: { wind: '5', windDegrees: '90' },
                    1500: { wind: 'abc', windDegrees: 180 },
                    3000: { wind: 12, windDegrees: 270 },
                    9999: { wind: 1, windDegrees: 1 },
                },
            },
        })
        expect(result.settings.manualWindsAloft).toEqual({
            600: { wind: 5, windDegrees: 90 },
            3000: { wind: 12, windDegrees: 270 },
        })
    })

    it('stores null when manual winds are missing or invalid', () => {
        expect(
            sanitizeStorage({ settings: {} }).settings.manualWindsAloft,
        ).toBeNull()
        expect(
            sanitizeStorage({ settings: { manualWindsAloft: 'x' } }).settings
                .manualWindsAloft,
        ).toBeNull()
        expect(
            sanitizeStorage({
                settings: { manualWindsAloft: { 600: { wind: 'a' } } },
            }).settings.manualWindsAloft,
        ).toBeNull()
    })
})
