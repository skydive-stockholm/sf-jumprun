import { ref } from 'vue'

export function useServerEvents(onUpdate, isConnected = ref(false)) {
    let evtSource = null
    let reconnectTimeout = null
    let pollingInterval = null
    let closed = false

    function startPolling() {
        if (pollingInterval) return
        pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/storage`)
                onUpdate(await res.json())
            } catch {
                // Server still unavailable
            }
        }, 1000)
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
        }
    }

    function scheduleReconnect(delay = 5000) {
        if (closed || reconnectTimeout) return
        reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null
            connect()
        }, delay)
    }

    function connect() {
        if (closed) return
        if (evtSource) evtSource.close()

        evtSource = new EventSource(`/subscribe`)

        evtSource.onopen = () => {
            isConnected.value = true
            stopPolling()
        }

        evtSource.onerror = () => {
            isConnected.value = false
            evtSource?.close()
            evtSource = null
            startPolling()
            scheduleReconnect(5000)
        }

        evtSource.onmessage = (event) => {
            try {
                onUpdate(JSON.parse(event.data))
            } catch {
                // Ignore malformed payloads
            }
        }
    }

    function reconnectNow() {
        if (closed) return
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = null
        }
        connect()
    }

    window.addEventListener('online', reconnectNow)

    function close() {
        closed = true
        window.removeEventListener('online', reconnectNow)
        evtSource?.close()
        evtSource = null
        if (reconnectTimeout) clearTimeout(reconnectTimeout)
        stopPolling()
    }

    connect()

    return { isConnected, close }
}
