import axios from 'axios'
import { groupBy, mapKeys } from 'lodash'
import { reactive, ref } from 'vue'

export const useWeatherAloft = () => {
    const data = ref([])
    const current = ref(null)

    const update = async () => {
        const endpoint = `https://insidan.skydive.se/api/weatheraloft`
        const response = await axios.get(endpoint)

        data.value = groupBy(response.data, 'from')

        const key = Object.keys(data.value).find(timestamp => {
            const date = new Date(timestamp)
            const now = new Date()

            return date.getTime() <= now.getTime()
        })

        console.log(data.value[key])

        if (data.value[key]) {
            current.value = mapKeys(data.value[key], 'altitude')
            console.log(current.value)
        }
    }

    update()

    return reactive({
        update,
        data,
        current,
    })
}
