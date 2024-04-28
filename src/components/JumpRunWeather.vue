<script setup>
import { useWeatherAloft } from '../composables/useWeatherAloft.js'
import { useWeather } from '../composables/useWeather.js'

const weatherAloft = useWeatherAloft()
const groundWeather = useWeather()
</script>

<template>
    <div v-if="weatherAloft.current" :class="$style.container">
        <div style="font-size: 70%" :class="$style.item">
            <strong>Altitude</strong>

            <strong>Wind</strong>

            <strong>Wind dir</strong>

            <strong>Temp</strong>
        </div>
        <div v-if="groundWeather" :class="$style.item">
            <strong>0m</strong>
            <span
                >{{ Math.round(groundWeather.current.wind * 10) / 10 }} m/s
            </span>
            <span>{{ groundWeather.current.windDegrees }}°</span>
            <span>{{ groundWeather.current.temperature }}°</span>
        </div>

        <div
            v-for="(data, alti) in weatherAloft.current"
            :key="alti"
            :class="$style.item"
        >
            <strong>{{ alti }}m</strong>
            <span>{{ Math.round(data.wind * 10) / 10 }} m/s </span>
            <span>{{ data.windDegrees }}°</span>
            <span>{{ data.temperature }}°</span>
        </div>
    </div>
</template>

<style module>
.item {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 15px;
}

.container {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
</style>
