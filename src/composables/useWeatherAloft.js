import { reactive } from 'vue'

const endpoint = 'https://insidan.skydive.se/api/weatheraloft'

export const WIND_ALTITUDES = [600, 1500, 3000]

const store = reactive({
    data: {},
    current: {
        600: { altitude: 600, temperature: 0, wind: 0, windDegrees: 0 },
        1500: { altitude: 1500, temperature: 0, wind: 0, windDegrees: 0 },
        3000: { altitude: 3000, temperature: 0, wind: 0, windDegrees: 0 },
    },
    hasData: false,
    manual: false,
    forecast: null,
    update,
})

let inFlight = null

function update() {
    if (store.manual) return Promise.resolve()
    if (!inFlight) {
        inFlight = refresh().finally(() => {
            inFlight = null
        })
    }
    return inFlight
}

async function refresh() {
    try {
        const response = await fetch(endpoint)
        if (!response.ok) return

        const json = await response.json()
        if (!Array.isArray(json) || json.length === 0) return

        // Manual winds were set while this request was in flight
        if (store.manual) return

        const grouped = Object.groupBy(json, (item) => item.from)
        store.data = grouped

        // Latest period that has started; keep the previous forecast when
        // the response has no started period yet.
        const key = Object.keys(grouped).findLast((timestamp) => {
            return new Date(timestamp).getTime() <= Date.now()
        })

        if (grouped[key]) {
            store.current = Object.fromEntries(
                grouped[key].map((item) => [item.altitude, item]),
            )
            store.forecast = {
                from: key,
                to: grouped[key][0]?.to || null,
                issued: grouped[key][0]?.issued || null,
            }
            store.hasData = true
        }
    } catch {
        // Keep the last successful forecast on transient failures
    }
}

function parseManualWinds(setting) {
    if (!setting || typeof setting !== 'object') return null

    const entries = WIND_ALTITUDES.flatMap((altitude) => {
        const row = setting[altitude]
        if (!row || typeof row !== 'object') return []
        const wind = Number(row.wind)
        const windDegrees = Number(row.windDegrees)
        if (!Number.isFinite(wind) || !Number.isFinite(windDegrees)) return []
        return [{ altitude, wind, windDegrees }]
    })
    return entries.length > 0 ? entries : null
}

/**
 * Apply the manualWindsAloft setting: an object keyed by altitude with
 * { wind, windDegrees } halts the automatic forecast updates and overrides
 * the store; null/empty resumes automatic updates.
 */
export function applyManualWindsSetting(setting) {
    const entries = parseManualWinds(setting)

    if (!entries) {
        if (!store.manual) return
        store.manual = false
        update()
        return
    }

    store.manual = true
    store.hasData = true
    entries.forEach(({ altitude, wind, windDegrees }) => {
        store.current[altitude] = {
            ...store.current[altitude],
            altitude,
            temperature: null,
            wind,
            windDegrees,
        }
    })
}

let started = false

export const useWeatherAloft = () => {
    if (!started) {
        started = true
        update()
        setInterval(update, 15 * 60 * 1000)
    } else if (!store.hasData) {
        update()
    }

    return store
}
