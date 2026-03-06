<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {
    addTextToMap,
    calcJumpRunParams,
    calcShiftFromMidpoint,
    createCircleFeature,
    createJumprunFeature,
    createLineFeature,
    getJumpRunEndpoints,
    updateJumpRun,
} from '../utils/geometry.js'
import coordinates from '../data/coordinates.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import AdminPanel from '../AdminPanel.vue'
import { useServerEvents } from '../composables/useServerEvents.js'

// Is the server events connection open?
const isConnected = ref(false)

// Admin dialog element reference
const adminDialog = ref(null)
const map = ref(null)
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

const toggleAdminDialog = () => {
    // Only show admin dialog on localhost
    if (window.location.hostname !== 'localhost') {
        return
    }

    if (adminDialog.value.open) {
        adminDialog.value.close()
    } else {
        adminDialog.value.showModal()
    }
}

const isAdmin = window.location.hostname === 'localhost'
const hasUnsavedChanges = ref(false)
const isDragging = ref(false)
let startMarker, endMarker, midMarker

function createDragHandle(color) {
    const el = document.createElement('div')
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = color
    el.style.border = '3px solid white'
    el.style.cursor = 'grab'
    el.style.boxShadow = '0 0 6px rgba(0,0,0,0.5)'
    return el
}

function initDragHandles(mapInstance) {
    const endpoints = getJumpRunEndpoints(
        data.jumprun.start,
        data.jumprun.end,
        data.jumprun.shift,
        data.jumprun.angle,
    )

    startMarker = new mapboxgl.Marker({
        element: createDragHandle('#00ff00'),
        draggable: true,
    })
        .setLngLat(endpoints.start)
        .addTo(mapInstance)

    endMarker = new mapboxgl.Marker({
        element: createDragHandle('#ff0000'),
        draggable: true,
    })
        .setLngLat(endpoints.end)
        .addTo(mapInstance)

    midMarker = new mapboxgl.Marker({
        element: createDragHandle('#ffffff'),
        draggable: true,
    })
        .setLngLat(endpoints.mid)
        .addTo(mapInstance)

    const onDragStart = () => {
        isDragging.value = true
    }
    const onDragEnd = () => {
        isDragging.value = false
        hasUnsavedChanges.value = true
        updateDragHandles()
    }

    startMarker.on('dragstart', onDragStart)
    endMarker.on('dragstart', onDragStart)
    midMarker.on('dragstart', onDragStart)

    startMarker.on('dragend', onDragEnd)
    endMarker.on('dragend', onDragEnd)
    midMarker.on('dragend', onDragEnd)

    startMarker.on('drag', () => {
        const sl = startMarker.getLngLat()
        const el = endMarker.getLngLat()
        const params = calcJumpRunParams(
            [sl.lng, sl.lat],
            [el.lng, el.lat],
            data.jumprun.angle,
        )
        data.jumprun = params
        updateJumpRun(
            mapInstance,
            params.start,
            params.end,
            params.shift,
            params.angle,
        )
        const ep = getJumpRunEndpoints(
            params.start,
            params.end,
            params.shift,
            params.angle,
        )
        midMarker.setLngLat(ep.mid)
    })

    endMarker.on('drag', () => {
        const sl = startMarker.getLngLat()
        const el = endMarker.getLngLat()
        const params = calcJumpRunParams(
            [sl.lng, sl.lat],
            [el.lng, el.lat],
            data.jumprun.angle,
        )
        data.jumprun = params
        updateJumpRun(
            mapInstance,
            params.start,
            params.end,
            params.shift,
            params.angle,
        )
        const ep = getJumpRunEndpoints(
            params.start,
            params.end,
            params.shift,
            params.angle,
        )
        midMarker.setLngLat(ep.mid)
    })

    midMarker.on('drag', () => {
        const ml = midMarker.getLngLat()
        const shift = calcShiftFromMidpoint(
            [ml.lng, ml.lat],
            data.jumprun.angle,
        )
        data.jumprun.shift = shift
        updateJumpRun(
            mapInstance,
            data.jumprun.start,
            data.jumprun.end,
            shift,
            data.jumprun.angle,
        )
        const ep = getJumpRunEndpoints(
            data.jumprun.start,
            data.jumprun.end,
            shift,
            data.jumprun.angle,
        )
        startMarker.setLngLat(ep.start)
        endMarker.setLngLat(ep.end)
    })
}

function updateDragHandles() {
    if (!startMarker) return
    const ep = getJumpRunEndpoints(
        data.jumprun.start,
        data.jumprun.end,
        data.jumprun.shift,
        data.jumprun.angle,
    )
    startMarker.setLngLat(ep.start)
    endMarker.setLngLat(ep.end)
    midMarker.setLngLat(ep.mid)
}

function initMap() {
    const viteMapboxApiKey = import.meta.env.VITE_MAPBOX_API_KEY

    if (!viteMapboxApiKey) {
        throw new Error('Environment variable VITE_MAPBOX_API_KEY is not set')
    }

    mapboxgl.accessToken = viteMapboxApiKey

    let zoom = 13.5

    // If on mobile, set zoom to 12
    if (window.innerWidth < 768) {
        zoom = 12.5
    }

    return new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12?optimize=true',
        center: coordinates.mapCenter,
        zoom: zoom,
    })
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
    createJumprunFeature(map, -0.2, 0.2, 0, 30)

    // Add text 1 nautical mile north of the map center
    addTextToMap(map, '360°', 0)

    // Add text 1 nautical mile east of the map center
    addTextToMap(map, '90°', 90)

    // Add text 1 nautical mile south of the map center
    addTextToMap(map, '180°', 180)

    // Add text 1 nautical mile west of the map center
    addTextToMap(map, '270°', 270)
}
let serverEventsClose

onMounted(() => {
    map.value = initMap()
    map.value.on('load', () => {
        initMapFeatures(map.value)

        if (isAdmin) {
            initDragHandles(map.value)
        }

        const { close } = useServerEvents((res) => {
            if (!res.jumprun) {
                return
            }

            if (res.staff) {
                data.staff = res.staff
            }

            if (isDragging.value || hasUnsavedChanges.value) {
                return
            }

            if (
                JSON.stringify(data.jumprun) === JSON.stringify(res.jumprun)
            ) {
                return
            }

            data.jumprun = res.jumprun

            updateJumpRun(
                map.value,
                data.jumprun.start,
                data.jumprun.end,
                data.jumprun.shift,
                data.jumprun.angle,
            )

            if (isAdmin) updateDragHandles()
        }, isConnected)
        serverEventsClose = close
    })
})

onUnmounted(() => {
    serverEventsClose?.()
    if (startMarker) startMarker.remove()
    if (endMarker) endMarker.remove()
    if (midMarker) midMarker.remove()
    map.value?.remove()
})

const save = () => {
    const raw = { staff: { ...data.staff }, jumprun: { ...data.jumprun } }
    fetch(`http://${import.meta.env.VITE_HOST}:3009/api/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(raw),
    })
    hasUnsavedChanges.value = false
}
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
            <AdminPanel
                v-model:manifestor="data.staff.manifestor"
                v-model:jump-leader="data.staff.jumpLeader"
                v-model:pilot="data.staff.pilot"
                @close="toggleAdminDialog"
                @save="save"
            />
        </dialog>

        <div :class="$style.mapContainer">
            <!-- Mapbox map -->
            <div id="map" :class="$style.mapBox"></div>

            <JumpRunInfoBox
                :staff="data.staff || null"
                :jumprun="data.jumprun || null"
                @click="toggleAdminDialog"
            />
        </div>

        <button
            v-if="hasUnsavedChanges"
            :class="$style.saveButton"
            @click="save"
        >
            Save jump run
        </button>

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
        /** Two column grid divided equally 50% vertically */
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
        height: 100%;
    }
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

.saveButton {
    position: fixed;
    z-index: 1000;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: #4a8af4;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(74, 138, 244, 0.5);
    animation: pulse 1.5s ease-in-out infinite;
}

.saveButton:hover {
    background: #6aa0ff;
}

@keyframes pulse {
    0%, 100% { transform: translateX(-50%) scale(1); box-shadow: 0 0 10px rgba(74, 138, 244, 0.5); }
    50% { transform: translateX(-50%) scale(1.05); box-shadow: 0 0 30px rgba(74, 138, 244, 0.9), 0 0 60px rgba(74, 138, 244, 0.4); }
}
</style>
