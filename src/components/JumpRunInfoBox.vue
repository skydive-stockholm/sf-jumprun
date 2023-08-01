<template>
    <section :class="$style.infoBox">
        <div :class="$style.lastGust">
            <strong>Last gust (30 min):</strong> {{ lastGust }}
        </div>

        <div :class="$style.phoneNumber">
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
    </section>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
import axios from 'axios'

const staff = ref({
    jumpLeader: '',
    manifestor: '',
    pilot: '',
})

const lastGust = ref(null)

const fetchData = () => {
    axios.get('https://insidan.skydive.se/api/weather').then(res => {
        lastGust.value = res.data.lastGust30Min
    })

    axios.get('http://localhost:3008/api/storage').then(res => {
        staff.value = res.data.staff
    })
}

fetchData()
setInterval(fetchData, 1000 * 10)

onUnmounted(() => {
    clearInterval(fetchData)
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
}

.lastGust {
}
</style>
