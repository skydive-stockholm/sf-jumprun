<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import axios from 'axios'
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {
    createCircleFeature,
    createJumprunFeature,
    createLineFeature,
    updateJumpRun,
} from '../utils/geometry.js'
import coordinates from '../data/coordinates.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import AdminPanel from '../AdminPanel.vue'

// Is the server events connection open?
const isConnected = ref(false)

// Admin dialog element reference
const adminDialog = ref(null)
const isAdmin = import.meta.env.VITE_ADMIN === 'true'
const map = ref(null)
const data = ref(null)
const toggleAdminDialog = () => {
    if (adminDialog.value.open) {
        adminDialog.value.close()
    } else {
        adminDialog.value.showModal()
    }
}

data.value = {
    staff: {
        manifestor: '',
        jumpLeader: '',
        pilot: '',
    },
    jumprun: {
        start: 0,
        end: 0,
        shift: 0,
        angle: 0,
    },
}

function initMap() {
    const viteMapboxApiKey = import.meta.env.VITE_MAPBOX_API_KEY

    if (!viteMapboxApiKey) {
        throw new Error('Environment variable VITE_MAPBOX_API_KEY is not set')
    }

    mapboxgl.accessToken = viteMapboxApiKey

    return new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12?optimize=true',
        center: coordinates.mapCenter,
        zoom: 13.5,
    })
}

function initServerEvents(onUpdate) {
    const evtSource = new EventSource('http://localhost:3008/subscribe')

    evtSource.onopen = () => {
        isConnected.value = true
    }

    evtSource.onerror = () => {
        isConnected.value = false
        evtSource.close()
    }

    evtSource.onmessage = event => {
        onUpdate(JSON.parse(event.data), event)
    }

    // Fallback to server events
    setInterval(async () => {
        if (isConnected.value === true) {
            return
        }

        const res = await axios.get('http://localhost:3008/api/storage')
        onUpdate(res.data)
    }, 1000)

    return evtSource
}

function initMapFeatures(map) {
    // Create circles with 0.1 nautical miles in between each one
    for (let i = 0.1; i <= 1.5; i = i + 0.1) {
        let color = 'black'
        if (i === 0.5 || i === 1 || i === 1.5) {
            color = 'red'
        }
        createCircleFeature(map, i, color)
    }

    // Create lines for x and y axis
    ;['x', 'y'].forEach(axis => createLineFeature(map, axis))

    // Create jumprun arrow
    createJumprunFeature(map, 0, 0, 0, 30)
}
const eventSource = ref(null)
onMounted(() => {
    map.value = initMap()
    map.value.on('load', () => {
        initMapFeatures(map.value)
        eventSource.value = initServerEvents(res => {
            data.value = res

            if (!data.value.jumprun) {
                return
            }

            updateJumpRun(
                map.value,
                data.value.jumprun.start,
                data.value.jumprun.end,
                data.value.jumprun.shift,
                data.value.jumprun.angle,
            )
        })
    })

    onUnmounted(() => {
        eventSource.value.close()
        map.value.remove()
    })
})
</script>

<template>
    <div :class="$style.map">
        <img
            src="../assets/north-arrow.svg"
            alt="Compass"
            :class="$style.compass"
        />

        <!-- A modal dialog containing a form -->
        <dialog ref="adminDialog" :class="$style.adminDialog">
            <form>
                <AdminPanel @cancel="toggleAdminDialog" />
            </form>
        </dialog>

        <JumpRunInfoBox :staff="data.staff" :jumprun="data.jumprun">
            <button
                v-if="false && isAdmin"
                :class="$style.openAdminDialog"
                @click="toggleAdminDialog"
            >
                Change staff
            </button>
        </JumpRunInfoBox>

        <!--        <iframe-->
        <!--            :class="$style.forecast"-->
        <!--            src="https://www.yr.no/en/content/2-2710090/card.html"-->
        <!--        ></iframe>-->

        <div v-if="isConnected" :class="$style.connectionMessage">
            <div :class="[$style.connectionDot, $style.active]"></div>

            Connected
        </div>
        <div v-else :class="$style.connectionMessage">
            <div :class="[$style.connectionDot, $style.inactive]"></div>

            Not connected
        </div>

        <div id="map" :class="$style.mapBox"></div>
    </div>
</template>

<style module>
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

.adminDialog {
    z-index: 1000;
    position: fixed;
    border: 0;
    border-bottom-right-radius: 8px;
    box-shadow: 10px 5px 5px rgba(0, 0, 0, 0.2);
}

.adminDialog::backdrop {
    background-color: rgba(0, 0, 0, 0);
    pointer-events: auto;
    display: none;
}

.forecast {
    position: fixed;
    z-index: 100;
    width: 320px;
    height: 345px;
    border-bottom-right-radius: 8px;
    top: -55px;
    border: 0;
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
