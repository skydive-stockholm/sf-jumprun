import { onUnmounted, reactive, ref } from 'vue'
import axios from 'axios'
import weatherData from '../data/weatherData.json'

export const useWeather = () => {
    const weatherApiUrl = `https://insidan.skydive.se/api/weather`

    const result = reactive({
        windDirection: '',
        windDegrees: 0,
        wind: 0,
        windGust: 0,
        temperature: 0,
    })

    const data = ref([])

    function roundNumber(val) {
        return Math.round(val * 10) / 10
    }

    function setData(val) {
        if (!val || !val?.length) {
            return
        }

        data.value = val

        const item = val[val.length - 1]

        result.windDirection = windDirection(item.windDegrees).name
        result.windDegrees = item.windDegrees
        result.wind = roundNumber(item.wind)
        result.windGust = roundNumber(item.windGust)
        result.temperature = roundNumber(item.temperature)

        return result
    }

    function fetchWeather() {
        if (import.meta.env.DEV) {
            return setData(weatherData)
        }

        axios.get(weatherApiUrl).then(({ data }) => {
            setData(data)
        })
    }

    /**
     * Get the wind direction from degrees
     * @param deg
     * @returns {{name: string, dir: number[]}|{name: string, dir: number[]}|{name: string, dir: number[]}|{name: string, dir: number[]}|{name: string, dir: number[]}}
     */
    function windDirection(deg) {
        const directions = [
            { name: 'N', dir: [348.75, 11.25] },
            { name: 'NNE', dir: [11.25, 33.75] },
            { name: 'NE', dir: [33.75, 56.25] },
            { name: 'ENE', dir: [56.25, 78.75] },
            { name: 'E', dir: [78.75, 101.25] },
            { name: 'ESE', dir: [101.25, 123.75] },
            { name: 'SE', dir: [123.75, 146.25] },
            { name: 'SSE', dir: [146.25, 168.75] },
            { name: 'S', dir: [168.75, 191.25] },
            { name: 'SSW', dir: [191.25, 213.75] },
            { name: 'SW', dir: [213.75, 236.25] },
            { name: 'WSW', dir: [236.25, 258.75] },
            { name: 'W', dir: [258.75, 281.25] },
            { name: 'WNW', dir: [281.25, 303.75] },
            { name: 'NW', dir: [303.75, 326.25] },
            { name: 'NNW', dir: [326.25, 348.75] },
        ]

        // Special case for north
        if (deg < 11.25 || deg > 348.75) return directions[0]

        // Find the direction
        return directions.find(item => {
            if (item.dir[0] <= deg && deg <= item.dir[1]) {
                return true
            }
        })
    }

    // Fetch the weather on created
    fetchWeather()

    // Set timeout to fetch weather 2 minutes
    const interval = setInterval(fetchWeather, 2 * 60 * 1000)
    onUnmounted(() => clearInterval(interval))

    return {
        current: result,
        history: data,
        update: fetchWeather,
    }
}
