import { describe, it, expect, beforeEach, vi } from 'vitest'

let sseModule

describe('sse', () => {
    beforeEach(async () => {
        vi.resetModules()
        sseModule = await import('../../backend/sse.js')
    })

    it('addClient registers a client and calls writeHead', () => {
        const req = { on: vi.fn() }
        const res = { writeHead: vi.fn(), write: vi.fn() }

        sseModule.addClient(req, res)

        expect(res.writeHead).toHaveBeenCalledWith(
            200,
            expect.objectContaining({
                'Content-Type': 'text/event-stream',
            }),
        )
        expect(sseModule.getClientCount()).toBe(1)
    })

    it('sendEventsToAll writes to all clients', () => {
        const req = { on: vi.fn() }
        const res1 = { writeHead: vi.fn(), write: vi.fn() }
        const res2 = { writeHead: vi.fn(), write: vi.fn() }

        sseModule.addClient(req, res1)
        sseModule.addClient(req, res2)

        sseModule.sendEventsToAll({ test: true })

        expect(res1.write).toHaveBeenCalledWith('data: {"test":true}\n\n')
        expect(res2.write).toHaveBeenCalledWith('data: {"test":true}\n\n')
    })

    it('removes client on connection close', () => {
        let closeHandler
        const req = {
            on: vi.fn((event, handler) => {
                if (event === 'close') closeHandler = handler
            }),
        }
        const res = { writeHead: vi.fn(), write: vi.fn() }

        sseModule.addClient(req, res)
        expect(sseModule.getClientCount()).toBe(1)

        closeHandler()
        expect(sseModule.getClientCount()).toBe(0)
    })
})
