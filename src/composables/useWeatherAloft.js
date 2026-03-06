import { reactive, ref } from 'vue'

export const useWeatherAloft = () => {
    const data = ref([])
    const current = ref({
        600: { altitude: 600, temperature: 0, wind: 0, windDegrees: 0 },
        1500: { altitude: 1500, temperature: 0, wind: 0, windDegrees: 0 },
        3000: { altitude: 3000, temperature: 0, wind: 0, windDegrees: 0 },
    })

    const update = async () => {
        const endpoint = 'https://insidan.skydive.se/api/weatheraloft'
        const response = await fetch(endpoint)
        const json = await response.json()

        const grouped = Object.groupBy(json, item => item.from)
        data.value = grouped

        const key = Object.keys(grouped).find(timestamp => {
            return new Date(timestamp).getTime() <= Date.now()
        })

        if (grouped[key]) {
            current.value = Object.fromEntries(
                grouped[key].map(item => [item.altitude, item]),
            )
        }
    }

    update()

    return reactive({ update, data, current })
}
