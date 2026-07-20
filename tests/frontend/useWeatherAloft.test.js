import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    useWeatherAloft,
    applyManualWindsSetting,
} from '../../src/composables/useWeatherAloft.js'

const fetchMock = vi.fn().mockResolvedValue({ ok: false })
vi.stubGlobal('fetch', fetchMock)

describe('applyManualWindsSetting', () => {
    beforeEach(() => {
        fetchMock.mockClear()
    })

    it('overrides the store and halts automatic updates', async () => {
        const store = useWeatherAloft()
        await store.update()
        fetchMock.mockClear()

        applyManualWindsSetting({
            600: { wind: '5', windDegrees: '90' },
            3000: { wind: 12, windDegrees: 270 },
        })

        expect(store.manual).toBe(true)
        expect(store.hasData).toBe(true)
        expect(store.current[600]).toMatchObject({
            altitude: 600,
            wind: 5,
            windDegrees: 90,
            temperature: null,
        })
        expect(store.current[3000].wind).toBe(12)

        await store.update()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('resumes automatic updates when cleared', async () => {
        const store = useWeatherAloft()
        applyManualWindsSetting({ 600: { wind: 5, windDegrees: 90 } })
        fetchMock.mockClear()

        applyManualWindsSetting(null)
        expect(store.manual).toBe(false)
        expect(fetchMock).toHaveBeenCalledTimes(1)

        // Clearing again while already automatic does not refetch
        applyManualWindsSetting(undefined)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('ignores settings without any valid entry', () => {
        const store = useWeatherAloft()
        applyManualWindsSetting({ 600: { wind: 'abc', windDegrees: '' } })
        expect(store.manual).toBe(false)
    })
})
