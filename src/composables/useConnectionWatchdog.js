import { onMounted, onUnmounted } from 'vue'

// Last-resort recovery for the unattended public display. When the internet or
// the local backend goes down and later comes back, the page can be left in a
// broken state: a dead map, stalled weather, failed JS chunks, or a backend now
// serving a newer build. Once connectivity is confirmed back after a sustained
// outage, reload the page for a clean slate. Only ever used on the public view
// (never the admin view, which holds unsaved edits).

const BACKEND_PROBE = '/api/storage'
const INTERNET_PROBES = [
    'https://insidan.skydive.se/api/lastweather',
    'https://api.mapbox.com/',
]

async function reachable(url, { mode = 'cors', timeoutMs = 5000 } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        await fetch(url, {
            mode,
            cache: 'no-store',
            signal: controller.signal,
        })
        return true
    } catch {
        return false
    } finally {
        clearTimeout(timer)
    }
}

async function internetReachable() {
    // Any host reachable means the internet the display needs is back.
    const results = await Promise.all(
        INTERNET_PROBES.map(url => reachable(url, { mode: 'no-cors' })),
    )
    return results.some(Boolean)
}

export function useConnectionWatchdog({
    probeIntervalMs = 8000,
    minOutageMs = 6000,
} = {}) {
    let intervalId = null
    let downSince = null
    let reloading = false
    let checking = false

    function reload() {
        if (reloading) return
        reloading = true
        stop()
        window.location.reload()
    }

    async function check() {
        if (reloading || checking) return
        checking = true
        try {
            const backendOk = await reachable(BACKEND_PROBE)
            const online = navigator.onLine !== false
            const netOk = backendOk && online && (await internetReachable())

            if (netOk) {
                if (downSince && Date.now() - downSince >= minOutageMs) {
                    reload()
                }
                downSince = null
            } else if (!downSince) {
                downSince = Date.now()
            }
        } finally {
            checking = false
        }
    }

    function markDown() {
        if (!downSince) downSince = Date.now()
    }

    function onOnlineOrVisible() {
        // Don't blindly reload on the OS "online" event — it can fire before the
        // WAN is truly up. Confirm reachability with a real probe first.
        if (document.visibilityState === 'hidden') return
        check()
    }

    function start() {
        intervalId = setInterval(check, probeIntervalMs)
        window.addEventListener('offline', markDown)
        window.addEventListener('online', onOnlineOrVisible)
        document.addEventListener('visibilitychange', onOnlineOrVisible)
    }

    function stop() {
        if (intervalId) clearInterval(intervalId)
        intervalId = null
        window.removeEventListener('offline', markDown)
        window.removeEventListener('online', onOnlineOrVisible)
        document.removeEventListener('visibilitychange', onOnlineOrVisible)
    }

    onMounted(start)
    onUnmounted(stop)
}
