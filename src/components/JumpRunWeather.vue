<script setup>
import { computed } from 'vue'
import { useWeatherAloft } from '../composables/useWeatherAloft.js'
import { useWeather } from '../composables/useWeather.js'

const weatherAloft = useWeatherAloft()
const groundWeather = useWeather()

const time = (iso) =>
    new Date(iso).toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
    })

const forecastNote = computed(() => {
    const f = weatherAloft.forecast
    if (weatherAloft.manual || !f?.to) return null
    const validity = `Forecast valid until ${time(f.to)}`
    return f.issued ? `${validity} (issued ${time(f.issued)})` : validity
})
</script>

<template>
    <div
        v-if="groundWeather.hasData || weatherAloft.hasData"
        :class="$style.container"
    >
        <div style="font-size: 70%" :class="$style.item">
            <strong>Altitude</strong>

            <strong>Wind (gust)</strong>

            <strong>Wind dir</strong>

            <strong>Temp</strong>
        </div>
        <div v-if="groundWeather.hasData" :class="$style.item">
            <strong>0m</strong>
            <span
                >{{ Math.round(groundWeather.current.wind * 10) / 10 }}
                ({{ Math.round(groundWeather.current.windGust * 10) / 10 }})
                m/s
            </span>
            <span>{{ groundWeather.current.windDegrees }}°</span>
            <span>{{ groundWeather.current.temperature }}°</span>
        </div>

        <template v-if="weatherAloft.hasData">
            <div
                v-for="(data, alti) in weatherAloft.current"
                :key="alti"
                :class="$style.item"
            >
                <strong>{{ alti }}m</strong>
                <span>{{ Math.round(data.wind * 10) / 10 }} m/s </span>
                <span>{{ data.windDegrees }}°</span>
                <span v-if="data.temperature != null"
                    >{{ data.temperature }}°</span
                >
                <span v-else>–</span>
            </div>
        </template>

        <div v-if="weatherAloft.manual" :class="$style.manualNote">
            Manual winds aloft — forecast updates paused
        </div>
        <div v-else-if="forecastNote" :class="$style.forecastNote">
            {{ forecastNote }}
        </div>
    </div>
</template>

<style module>
.item {
    display: grid;
    grid-template-columns: 0.9fr 1.4fr 0.9fr 0.8fr;
    gap: 15px;
    white-space: nowrap;
}

.container {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.manualNote {
    font-size: 70%;
    color: #fbbf24;
}

.forecastNote {
    font-size: 70%;
    color: #999;
}
</style>
