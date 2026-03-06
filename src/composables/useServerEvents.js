import { ref } from 'vue'

export function useServerEvents(onUpdate, isConnected = ref(false)) {
    let evtSource
    let reconnectTimeout
    let pollingInterval

    function connect() {
        evtSource = new EventSource(
            `http://${import.meta.env.VITE_HOST}:3008/subscribe`,
        )

        evtSource.onopen = () => {
            isConnected.value = true
            if (pollingInterval) {
                clearInterval(pollingInterval)
                pollingInterval = null
            }
        }

        evtSource.onerror = () => {
            isConnected.value = false
            evtSource.close()

            if (!pollingInterval) {
                pollingInterval = setInterval(async () => {
                    try {
                        const res = await fetch(
                            `http://${import.meta.env.VITE_HOST}:3008/api/storage`,
                        )
                        onUpdate(await res.json())
                    } catch {
                        // Server still unavailable
                    }
                }, 1000)
            }

            reconnectTimeout = setTimeout(connect, 5000)
        }

        evtSource.onmessage = (event) => {
            onUpdate(JSON.parse(event.data))
        }
    }

    function close() {
        evtSource?.close()
        if (reconnectTimeout) clearTimeout(reconnectTimeout)
        if (pollingInterval) clearInterval(pollingInterval)
    }

    connect()

    return { isConnected, close }
}
