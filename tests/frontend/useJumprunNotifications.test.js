import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import {
    useJumprunNotifications,
    enableNotifications,
    disableNotifications,
    watchSuggestionChanges,
    resetNotificationState,
    formatSuggestion,
    SETTLE_DELAY,
    COOLDOWN,
} from '../../src/composables/useJumprunNotifications.js'

const sent = []

class NotificationMock {
    static permission = 'granted'
    static requestPermission = vi.fn().mockResolvedValue('granted')
    // Android Chrome / iOS Safari: the constructor is service-worker only
    static throws = false

    constructor(title, options) {
        if (NotificationMock.throws) throw new TypeError('Illegal constructor')
        sent.push({ title, ...options })
        this.close = vi.fn()
    }
}

vi.stubGlobal('Notification', NotificationMock)

const store = useJumprunNotifications()

const run = { angle: 30, start: -0.2, end: 0.2, shift: 0 }

// Off screen by default: notifications are suppressed while the user looks
// at the map.
const setOnScreen = onScreen => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(onScreen)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(
        onScreen ? 'visible' : 'hidden',
    )
}

describe('jump run suggestion notifications', () => {
    beforeEach(async () => {
        vi.useFakeTimers()
        sent.length = 0
        resetNotificationState()
        setOnScreen(false)
        NotificationMock.permission = 'granted'
        NotificationMock.throws = false
        store.permission = 'granted'
        await enableNotifications()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('adopts the first suggestion silently', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        await vi.advanceTimersByTimeAsync(SETTLE_DELAY * 2)
        expect(sent).toHaveLength(0)
        stop()
    })

    it('notifies once the changed suggestion has settled', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.7, end: 0.4, shift: 0.1 }
        await nextTick()
        expect(sent).toHaveLength(0)

        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(1)
        expect(sent[0].title).toBe('New jump run suggested')
        expect(sent[0].body).toContain('260')
        stop()
    })

    it('coalesces a suggestion that keeps moving into one notification', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 240, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY / 2)
        suggestion.value = { angle: 270, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY / 4)
        expect(sent).toHaveLength(0)

        // One notification, carrying the value it had settled on, timed from
        // the first change rather than restarted by the second
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(1)
        expect(sent[0].body).toContain('270')
        stop()
    })

    it('does not let a constantly ticking suggestion postpone the notice', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        // Minor jitter, as the ground wind reading refreshes
        for (let i = 1; i <= 5; i++) {
            await vi.advanceTimersByTimeAsync(SETTLE_DELAY / 5)
            suggestion.value = {
                angle: 260 + i,
                start: -0.6,
                end: 0.5,
                shift: 0,
            }
        }

        expect(sent).toHaveLength(1)
        stop()
    })

    it('stays quiet for changes below the significance thresholds', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(1)

        // A few degrees drift is not news
        suggestion.value = { angle: 264, start: -0.62, end: 0.52, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY * 2)
        expect(sent).toHaveLength(1)
        stop()
    })

    it('keeps a cooldown between notifications', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(1)

        suggestion.value = { angle: 20, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(1)

        await vi.advanceTimersByTimeAsync(COOLDOWN)
        expect(sent).toHaveLength(2)
        stop()
    })

    it('does not notify about a suggestion the set jump run already matches', async () => {
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const current = { angle: 200, start: -0.6, end: 0.5, shift: 0 }
        const stop = watchSuggestionChanges(suggestion, () => current)

        suggestion.value = { angle: 260, start: -0.7, end: 0.4, shift: 0 }
        Object.assign(current, suggestion.value)
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(0)
        stop()
    })

    it('stays silent while the app is on screen but adopts the change', async () => {
        setOnScreen(true)
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(0)

        // Adopted, so the same suggestion does not fire once hidden either
        setOnScreen(false)
        suggestion.value = { angle: 261, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY * 2)
        expect(sent).toHaveLength(0)
        stop()
    })

    it('sends nothing while disabled', async () => {
        disableNotifications()
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY * 2)
        expect(sent).toHaveLength(0)
        expect(store.enabled).toBe(false)
        stop()
    })

    it('stays off when permission is refused', async () => {
        NotificationMock.permission = 'default'
        NotificationMock.requestPermission.mockResolvedValueOnce('denied')

        expect(await enableNotifications()).toBe(false)
        expect(store.enabled).toBe(false)
        expect(store.permission).toBe('denied')
    })

    it('survives a browser where the constructor throws', async () => {
        NotificationMock.throws = true
        const suggestion = ref({ angle: 200, start: -0.6, end: 0.5, shift: 0 })
        const stop = watchSuggestionChanges(suggestion, () => run)

        suggestion.value = { angle: 260, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY)
        expect(sent).toHaveLength(0)

        // Adopted despite the failure, so it is not retried on every change
        NotificationMock.throws = false
        suggestion.value = { angle: 261, start: -0.6, end: 0.5, shift: 0 }
        await vi.advanceTimersByTimeAsync(SETTLE_DELAY * 2)
        expect(sent).toHaveLength(0)
        stop()
    })

    it('reports unsupported when the browser has no Notification', async () => {
        const original = window.Notification
        delete window.Notification

        expect(await enableNotifications()).toBe(false)
        expect(useJumprunNotifications().supported).toBe(false)

        window.Notification = original
    })

    it('formats the suggestion for the notification body', () => {
        expect(
            formatSuggestion({
                angle: 45,
                start: -0.62,
                end: 0.48,
                shift: 0.1,
            }),
        ).toBe('Heading 045° · -0.62 to 0.48 nm · shift 0.10 nm')
        expect(
            formatSuggestion({ angle: 210, start: -0.5, end: 0.5, shift: 0 }),
        ).toBe('Heading 210° · -0.50 to 0.50 nm')
    })
})
