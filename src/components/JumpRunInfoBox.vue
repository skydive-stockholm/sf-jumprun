<template>
    <section :class="$style.infoBox">
        <slot />

        <div><strong>Last gust (30 min):</strong> {{ lastGust }}</div>

        <div>
            <strong>Manifest phone:</strong>
            +4676 135 43 85
        </div>

        <div>
            <div>
                <strong>Jump leader:</strong>
                {{ staff.jumpLeader }}
            </div>

            <div>
                <strong>Manifestor:</strong>
                {{ staff.manifestor }}
            </div>

            <div><strong>Pilot:</strong> {{ staff.pilot }}</div>
        </div>

        <div>
            <div>
                <strong>Green light:</strong>
                {{ jumprun.start }} nm
            </div>
            <div>
                <strong>Red light:</strong>
                {{ jumprun.end }} nm
            </div>
            <div>
                <strong>Heading:</strong>
                {{ jumprun.angle }}°
            </div>
        </div>
    </section>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
import axios from 'axios'

defineProps({
    staff: {
        type: Object,
        required: true,
    },
    jumprun: {
        type: Object,
        required: true,
    },
})

const lastGust = ref(null)

const fetchData = () => {
    return axios.get('https://insidan.skydive.se/api/weather').then(res => {
        lastGust.value = res.data.lastGust30Min
    })
}

fetchData()
const fetcherIntervalId = setInterval(fetchData, 1000)

onUnmounted(() => {
    clearInterval(fetcherIntervalId)
})
</script>

<style module>
.infoBox {
    position: fixed;
    z-index: 10;
    background: #fff;
    color: #000;
    padding: 20px 15px;
    bottom: 0;
    border-top-right-radius: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: flex;
    gap: 20px;
    flex-direction: column;
    width: 320px;
}
</style>
