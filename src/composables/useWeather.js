import { reactive } from 'vue'

import { windDirection, roundNumber } from '../utils/weather.js'

const weatherApiUrl = `https://insidan.skydive.se/api/lastweather`

const store = reactive({
    current: {
        windDirection: '',
        windDegrees: 0,
        wind: 0,
        windGust: 0,
        temperature: 0,
    },
    hasData: false,
    update,
})

let inFlight = null

function update() {
    if (!inFlight) {
        inFlight = fetch(weatherApiUrl)
            .then((res) => res.json())
            .then(setData)
            .catch(() => {})
            .finally(() => {
                inFlight = null
            })
    }
    return inFlight
}

function setData(val) {
    if (!val) {
        return
    }

    store.current.windDirection = windDirection(val.windDegrees).name
    store.current.windDegrees = val.windDegrees
    store.current.wind = roundNumber(val.windAverage)
    store.current.windGust = roundNumber(val.windGust)
    store.current.temperature = roundNumber(val.temperature)
    store.hasData = true
}

let started = false

export const useWeather = () => {
    if (!started) {
        started = true
        update()
        setInterval(update, 60 * 1000)
    } else if (!store.hasData) {
        update()
    }

    return store
}
