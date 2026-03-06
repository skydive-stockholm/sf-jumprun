<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {
    addTextToMap,
    createCircleFeature,
    createJumprunFeature,
    createLineFeature,
    updateJumpRun,
} from '../utils/geometry.js'
import { setMapCenter } from '../data/coordinates.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import { useServerEvents } from '../composables/useServerEvents.js'

const isConnected = ref(false)
const map = ref(null)
const configError = ref(false)
const data = reactive({
    staff: {
        manifestor: '',
        jumpLeader: '',
        pilot: '',
    },
    jumprun: {
        start: -0.2,
        end: 0.2,
        shift: 0,
        angle: 30,
    },
})

const settings = reactive({ mapboxApiKey: '', mapCenter: '' })

async function loadSettings() {
    try {
        const res = await fetch('http://localhost:3008/api/storage')
        const stored = await res.json()
        if (stored.settings) {
            settings.mapboxApiKey = stored.settings.mapboxApiKey || ''
            settings.mapCenter = stored.settings.mapCenter || ''
        }
    } catch {
        // Backend not available yet
    }
}

function getMapCenter() {
    const raw = settings.mapCenter || '17.42929, 60.28519'
    return raw.replace(/ /g, '').split(',').map(parseFloat)
}

function initMap() {
    if (!settings.mapboxApiKey) {
        configError.value = true
        return null
    }

    const center = getMapCenter()
    setMapCenter(center)
    mapboxgl.accessToken = settings.mapboxApiKey

    let zoom = 13.5
    if (window.innerWidth < 768) {
        zoom = 12.5
    }

    return new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12?optimize=true',
        center,
        zoom,
    })
}

function initMapFeatures(m) {
    for (let i = 0.1; i <= 1.5; i = i + 0.1) {
        let color = 'black'
        if (i === 0.5 || i === 1 || i === 1.5) {
            color = 'red'
        }
        createCircleFeature(m, i, color)
    }

    ;['x', 'y'].forEach((axis) => createLineFeature(m, axis))
    createJumprunFeature(m, -0.2, 0.2, 0, 30)
    addTextToMap(m, '360°', 0)
    addTextToMap(m, '90°', 90)
    addTextToMap(m, '180°', 180)
    addTextToMap(m, '270°', 270)
}

let serverEventsClose

onMounted(async () => {
    await loadSettings()
    map.value = initMap()
    if (!map.value) return

    map.value.on('load', () => {
        initMapFeatures(map.value)

        const { close } = useServerEvents((res) => {
            if (!res.jumprun) return

            if (res.staff) {
                data.staff = res.staff
            }

            if (
                JSON.stringify(data.jumprun) === JSON.stringify(res.jumprun)
            ) {
                return
            }

            Object.assign(data.jumprun, res.jumprun)

            updateJumpRun(
                map.value,
                data.jumprun.start,
                data.jumprun.end,
                data.jumprun.shift,
                data.jumprun.angle,
            )
        }, isConnected)
        serverEventsClose = close
    })
})

onUnmounted(() => {
    serverEventsClose?.()
    map.value?.remove()
})
</script>

<template>
    <div v-if="configError" :class="$style.errorScreen">
        Mapbox API key not configured. Ask an admin to set it up.
    </div>
    <div v-else :class="$style.map">
        <img
            src="../assets/north-arrow.svg"
            alt="Compass"
            :class="$style.compass"
        />

        <div :class="$style.mapContainer">
            <div id="map" :class="$style.mapBox"></div>

            <JumpRunInfoBox
                :staff="data.staff || null"
                :jumprun="data.jumprun || null"
            />
        </div>

        <div v-if="isConnected" :class="$style.connectionMessage">
            <div :class="[$style.connectionDot, $style.active]"></div>
            Connected
        </div>
        <div v-else :class="$style.connectionMessage">
            <div :class="[$style.connectionDot, $style.inactive]"></div>
            Not connected
        </div>
    </div>
</template>

<style module>
.errorScreen {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: #999;
    font-family: monospace;
    font-size: 16px;
}

.map {
    width: 100vw;
    height: 100vh;
}

.mapBox {
    width: 100%;
    height: 100%;
}

.compass {
    position: absolute;
    top: 0;
    right: 0;
    margin: 30px;
    z-index: 100;
    width: 120px;
}

.mapContainer {
    height: 100%;
    width: 100%;
}

@media (max-width: 768px) {
    .compass {
        display: none;
    }

    .mapContainer {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
        height: 100%;
    }
}

.connectionMessage {
    position: fixed;
    z-index: 1000;
    top: 10px;
    left: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fff;
    opacity: 0.8;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 1);
}

.connectionDot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: red;
}

.connectionDot.active {
    background-color: green;
}
</style>
