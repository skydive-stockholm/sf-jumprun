import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createStorage } from '../../backend/utils/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testFilePath = path.join(__dirname, 'test-data.json')

describe('storage', () => {
    let storage

    beforeEach(() => {
        storage = createStorage(testFilePath)
    })

    afterEach(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath)
        }
    })

    it('creates file and returns empty object when file does not exist', () => {
        const result = storage.fetch()
        expect(result).toEqual({})
        expect(fs.existsSync(testFilePath)).toBe(true)
    })

    it('saves and fetches data', () => {
        const data = {
            jumprun: { start: -0.2, end: 0.2, shift: 0, angle: 30 },
            staff: { manifestor: 'Alice', jumpLeader: 'Bob', pilot: 'Charlie' },
        }
        storage.save(data)
        expect(storage.fetch()).toEqual(data)
    })

    it('overwrites existing data on save', () => {
        storage.save({ a: 1 })
        storage.save({ b: 2 })
        expect(storage.fetch()).toEqual({ b: 2 })
    })

    it('returns empty object when file exists but is empty', () => {
        fs.writeFileSync(testFilePath, '')
        const result = storage.fetch()
        expect(result).toEqual({})
    })

    it('returns empty object when file contains invalid JSON', () => {
        fs.writeFileSync(testFilePath, '{broken')
        const result = storage.fetch()
        expect(result).toEqual({})
    })
})
