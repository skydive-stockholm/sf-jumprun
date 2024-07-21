import axios from 'axios'
import { groupBy, mapKeys } from 'lodash'
import { reactive, ref } from 'vue'

export const useWeatherAloft = () => {
    const data = ref([])
    const current = ref({
        600: {
            altitude: 600,
            temperature: 0,
            wind: 0,
            windDegrees: 0,
        },
        1500: {
            altitude: 1500,
            temperature: 0,
            wind: 0,
            windDegrees: 0,
        },
        3000: {
            altitude: 3000,
            temperature: 0,
            wind: 0,
            windDegrees: 0,
        },
    })

    const update = async () => {
        const endpoint = `https://insidan.skydive.se/api/weatheraloft`
        const response = await axios.get(endpoint)

        data.value = groupBy(response.data, 'from')

        const key = Object.keys(data.value).find(timestamp => {
            const date = new Date(timestamp)
            const now = new Date()

            return date.getTime() <= now.getTime()
        })

        if (data.value[key]) {
            current.value = mapKeys(data.value[key], 'altitude')
        }
    }

    update()

    return reactive({
        update,
        data,
        current,
    })
}
