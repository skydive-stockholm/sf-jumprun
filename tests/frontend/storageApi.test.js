import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveStorage } from '../../src/utils/storageApi.js'

describe('saveStorage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
    })

    it('posts to the private port, not the origin the page came from', async () => {
        await saveStorage({ jumprun: { start: -0.2 } })

        const [url, options] = fetch.mock.calls[0]
        expect(url).toBe('http://localhost:3009/api/storage')
        expect(options.method).toBe('POST')
        expect(JSON.parse(options.body)).toEqual({ jumprun: { start: -0.2 } })
    })

    it('throws when the server rejects the write', async () => {
        fetch.mockResolvedValue({ ok: false, status: 404 })

        await expect(saveStorage({})).rejects.toThrow('server responded 404')
    })

    it('propagates a failed connection', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'))

        await expect(saveStorage({})).rejects.toThrow('Failed to fetch')
    })
})
