// Native browser notifications when the suggested jump run changes.
//
// Deliberately quiet — a notification is only sent when all of these hold:
//  1. the user opted in on this device and granted permission
//  2. the suggestion differs significantly from the last one we announced
//  3. it also differs significantly from the jump run currently set, so it is
//     actually something to act on
//  4. the app is not on screen in front of the user (the on-map suggestion
//     banner already covers that case)
//  5. the suggestion has held still for SETTLE_DELAY, and at least COOLDOWN
//     has passed since the previous notification
import { reactive, watch } from 'vue'
import { isSignificantlyDifferent } from '../utils/jumprunSuggestion.js'

const STORAGE_KEY = 'jumprunNotifications'
const TAG = 'jumprun-suggestion'

export const SETTLE_DELAY = 30 * 1000 // let a changing suggestion come to rest
export const COOLDOWN = 10 * 60 * 1000 // floor between two notifications

const hasNotifications = () =>
    typeof window !== 'undefined' && 'Notification' in window

const readStored = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
        return false
    }
}

const writeStored = value => {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
        // Private mode or storage disabled: the choice just won't persist
    }
}

const store = reactive({
    supported: false,
    permission: 'denied',
    enabled: false,
})

// Support and permission are read lazily: this module can be imported before
// the browser environment is in place.
function sync() {
    store.supported = hasNotifications()
    store.permission = store.supported ? Notification.permission : 'denied'
    store.enabled = store.permission === 'granted' && readStored()
}

// The suggestion we last announced. Null means no baseline yet: the next
// suggestion is adopted silently instead of being announced, so opening the
// app or a first forecast never fires a notification.
let announced = null
let lastSentAt = 0
let timer = null

const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
}

// True while the user is looking at the app, so the map already shows it.
const isOnScreen = () =>
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    document.hasFocus()

export function formatSuggestion(suggestion) {
    const heading = String(suggestion.angle).padStart(3, '0')
    const run = `${suggestion.start.toFixed(2)} to ${suggestion.end.toFixed(
        2,
    )} nm`
    const shift =
        Math.abs(suggestion.shift) >= 0.01
            ? ` · shift ${suggestion.shift.toFixed(2)} nm`
            : ''
    return `Heading ${heading}° · ${run}${shift}`
}

function send(suggestion) {
    // Android Chrome and iOS Safari outside an installed PWA expose
    // Notification but only allow it from a service worker: the constructor
    // throws. Stay quiet rather than throwing out of the timer, and let the
    // caller adopt the suggestion so it is not retried on every change.
    try {
        const notification = new Notification('New jump run suggested', {
            body: formatSuggestion(suggestion),
            tag: TAG, // replaces an earlier notice instead of stacking up
        })
        notification.onclick = () => {
            window.focus()
            notification.close()
        }
    } catch {
        // no notification on this browser
    }
}

export function useJumprunNotifications() {
    sync()
    return store
}

export async function enableNotifications() {
    sync()
    if (!store.supported) return false

    store.permission =
        Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission

    if (store.permission !== 'granted') {
        store.enabled = false
        writeStored(false)
        return false
    }

    store.enabled = true
    writeStored(true)
    return true
}

export function disableNotifications() {
    clearTimer()
    store.enabled = false
    writeStored(false)
}

/**
 * Watch a suggestion and notify when it changes into something worth acting on.
 *
 * @param {import('vue').Ref} suggestion ref/computed of { angle, start, end, shift }
 * @param {Function} getCurrentJumprun returns the jump run currently set
 * @returns {Function} stop the watcher
 */
export function watchSuggestionChanges(suggestion, getCurrentJumprun) {
    sync()

    const isNews = value =>
        Boolean(value) &&
        isSignificantlyDifferent(value, announced) &&
        isSignificantlyDifferent(value, getCurrentJumprun())

    function fire() {
        timer = null
        const value = suggestion.value
        // Permission can be revoked while a notification is pending
        sync()
        if (!store.enabled) return
        if (!isNews(value)) return

        // Adopt it silently while the map is in front of the user: they can
        // already see the suggestion banner.
        if (!isOnScreen()) {
            send(value)
            lastSentAt = Date.now()
        }
        announced = value
    }

    const stop = watch(
        suggestion,
        value => {
            if (!value) return
            if (announced === null) {
                announced = value // baseline, announced silently
                return
            }
            if (!store.enabled || !isNews(value)) {
                // Drifted back to what was already announced: nothing to say
                clearTimer()
                return
            }
            // A notification is already pending; it picks up the latest value
            // when it fires. Restarting it here would let a suggestion that
            // keeps ticking over postpone the notice indefinitely.
            if (timer) return

            const cooldownLeft = lastSentAt + COOLDOWN - Date.now()
            timer = setTimeout(fire, Math.max(SETTLE_DELAY, cooldownLeft))
        },
        { immediate: true },
    )

    return () => {
        clearTimer()
        stop()
    }
}

// Test seam: forget the baseline and any pending notification.
export function resetNotificationState() {
    clearTimer()
    announced = null
    lastSentAt = 0
}
