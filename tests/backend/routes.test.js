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
})
