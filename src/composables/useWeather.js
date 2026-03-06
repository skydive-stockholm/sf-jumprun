import { reactive, ref } from 'vue'

import { windDirection, roundNumber } from '../utils/weather.js'

export const useWeather = () => {
    const weatherApiUrl = `https://insidan.skydive.se/api/lastweather`

    const result = reactive({
        windDirection: '',
        windDegrees: 0,
        wind: 0,
        windGust: 0,
        temperature: 0,
    })

    const data = ref([])

    function setData(val) {
        if (!val) {
            return
        }

        data.value = val

        result.windDirection = windDirection(val.windDegrees).name
        result.windDegrees = val.windDegrees
        result.wind = roundNumber(val.windAverage)
        result.windGust = roundNumber(val.windGust)
        result.temperature = roundNumber(val.temperature)

        return result
    }

    function fetchWeather() {
        fetch(weatherApiUrl)
            .then((res) => res.json())
            .then((data) => setData(data))
            .catch(() => {})
    }

    // Fetch the weather on created
    fetchWeather()

    return {
        current: result,
        update: fetchWeather,
    }
}
