<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
    createCircleData,
    createLineData,
    createJumprunData,
    createOffsetCircleData,
    createDriftBoxData,
    createLeadLineData,
    getTextPosition,
    getJumpRunEndpoints,
} from '../utils/geometry.js'
import { setMapCenter } from '../data/coordinates.js'
import { addBaseLayer } from '../utils/baseLayer.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import { useServerEvents } from '../composables/useServerEvents.js'
import { useConnectionWatchdog } from '../composables/useConnectionWatchdog.js'
import {
    useWeatherAloft,
    applyManualWindsSetting,
} from '../composables/useWeatherAloft.js'
import { useWeather } from '../composables/useWeather.js'
import {
    calculateExitSeparation,
    calculateCanopyCircle,
    calculateFreefallDrift,
    SUGGESTION_DEFAULTS,
} from '../utils/jumprunSuggestion.js'

const isConnected = ref(false)
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

const settings = reactive({ mapCenter: '' })
const settingsData = reactive({
    manifestPhone: '',
    separation: '',
    exitAltitude: '',
    openingAltitude: '',
    aircraftSpeed: '',
})

function assignSettingsData(source) {
    settingsData.manifestPhone = source.manifestPhone || ''
    settingsData.separation = source.separation || ''
    settingsData.exitAltitude = source.exitAltitude || ''
    settingsData.openingAltitude = source.openingAltitude || ''
    settingsData.aircraftSpeed = source.aircraftSpeed || ''
    applyManualWindsSetting(source.manualWindsAloft)
}

const weatherAloft = useWeatherAloft()
const groundWeather = useWeather()

useConnectionWatchdog()

const separationConfig = computed(() => {
    const config = { ...SUGGESTION_DEFAULTS }
    const exit = Number(settingsData.exitAltitude)
    if (exit > 0) config.exitAltitude = exit
    const opening = Number(settingsData.openingAltitude)
    if (opening > 0) config.openingAltitude = opening
    const speed = Number(settingsData.aircraftSpeed)
    if (speed > 0) config.aircraftSpeedKt = speed
    return config
})

const groundWindInput = computed(() =>
    groundWeather.hasData
        ? {
              speed: groundWeather.current.wind,
              direction: groundWeather.current.windDegrees,
          }
        : null,
)

const exitSeparation = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateExitSeparation(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        data.jumprun.angle,
        separationConfig.value,
    )
})

const canopyCircle = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateCanopyCircle(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        separationConfig.value,
    )
})

let jumprunLayer = null
let canopyCircleLayer = null

function replaceCanopyCircleLayer() {
    canopyCircleLayer?.remove()
    canopyCircleLayer = null

    const c = canopyCircle.value
    if (!map.value || !c) return

    canopyCircleLayer = L.geoJSON(
        createOffsetCircleData(c.radius, c.offset, c.bearing),
        {
            style: {
                color: '#38bdf8',
                weight: 2,
                opacity: 0.8,
                dashArray: '8 6',
                fillColor: '#38bdf8',
                fillOpacity: 0.05,
            },
        },
    ).addTo(map.value)
}

watch(canopyCircle, replaceCanopyCircleLayer)

let driftBoxLayer = null
const freefallDrift = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateFreefallDrift(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        data.jumprun.angle,
        separationConfig.value,
    )
})

function replaceDriftBoxLayer() {
    driftBoxLayer?.remove()
    driftBoxLayer = null

    const d = freefallDrift.value
    if (!map.value || !d) return

    const { start, end, shift, angle } = data.jumprun
    driftBoxLayer = L.geoJSON(createDriftBoxData(start, end, shift, angle, d), {
        style: {
            color: '#facc15',
            weight: 2,
            opacity: 0.8,
            dashArray: '8 6',
            fillColor: '#facc15',
            fillOpacity: 0.06,
        },
    }).addTo(map.value)
}

watch([freefallDrift, () => ({ ...data.jumprun })], replaceDriftBoxLayer)

// Yellow start of the run: flown with the green light on before first exit.
let leadLineLayer = null
function replaceLeadLineLayer() {
    leadLineLayer?.remove()
    leadLineLayer = null

    const d = freefallDrift.value
    if (!map.value || !d) return

    const { start, end, shift, angle } = data.jumprun
    const line = createLeadLineData(start, end, shift, angle, d.lead)
    if (!line) return

    leadLineLayer = L.geoJSON(line, {
        style: { color: '#facc15', weight: 6, opacity: 1 },
    }).addTo(map.value)
}

watch([freefallDrift, () => ({ ...data.jumprun })], replaceLeadLineLayer)

// Keep the run in view: long runs can extend well past the map center.
function recenterOnJumprun() {
    if (!map.value) return
    const { start, end, shift, angle } = data.jumprun
    const points = getJumpRunEndpoints(start, end, shift, angle)
    const bounds = L.latLngBounds([
        [points.start[1], points.start[0]],
        [points.end[1], points.end[0]],
    ])
    map.value.fitBounds(bounds, { padding: [150, 150], maxZoom: 15.5 })
}

watch(() => ({ ...data.jumprun }), recenterOnJumprun)

async function loadSettings() {
    try {
        const res = await fetch('/api/storage')
        const stored = await res.json()
        if (stored.settings) {
            settings.mapCenter = stored.settings.mapCenter || ''
            assignSettingsData(stored.settings)
        }
    } catch {
        // Backend not available yet
    }
}

function getMapCenter() {
    const raw = settings.mapCenter || '17.426283, 60.284016'
    return raw.replace(/ /g, '').split(',').map(parseFloat)
}

function initMap() {
    const center = getMapCenter()
    setMapCenter(center)

    let zoom = 13.5
    if (window.innerWidth < 768) {
        zoom = 12.5
    }

    const m = L.map('map', {
        center: [center[1], center[0]],
        zoom,
        zoomControl: false,
        zoomSnap: 0.1,
        preferCanvas: true,
    })

    addBaseLayer(m)

    return m
}

function initMapFeatures(m) {
    for (let i = 0.1; i <= 1.5; i = i + 0.1) {
        const isHighlight =
            Math.abs(i - 0.5) < 0.01 ||
            Math.abs(i - 1.0) < 0.01 ||
            Math.abs(i - 1.5) < 0.01
        const style = isHighlight
            ? { color: '#ff6d04', weight: 3, opacity: 0.45, fillOpacity: 0 }
            : { color: '#000000', weight: 2, opacity: 0.5, fillOpacity: 0 }
        L.geoJSON(createCircleData(i), { style }).addTo(m)
    }

    ;['x', 'y'].forEach(axis => {
        L.geoJSON(createLineData(axis), {
            style: { color: '#ff6d04', weight: 3, opacity: 0.7 },
        }).addTo(m)
    })

    jumprunLayer = L.geoJSON(createJumprunData(-0.2, 0.2, 0, 30), {
        style: { color: '#00ff00', weight: 6, opacity: 1 },
    }).addTo(m)

    const labels = [
        { text: '360\u00B0', angle: 0 },
        { text: '90\u00B0', angle: 90 },
        { text: '180\u00B0', angle: 180 },
        { text: '270\u00B0', angle: 270 },
    ]

    labels.forEach(({ text, angle }) => {
        const pos = getTextPosition(angle, 0.5)
        L.marker([pos[1], pos[0]], {
            icon: L.divIcon({
                className: '',
                html: `<div style="font-size:25px;font-weight:bold;color:#000;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;white-space:nowrap">${text}</div>`,
                iconAnchor: [20, 15],
            }),
        }).addTo(m)
    })
}

let serverEventsClose

onMounted(async () => {
    await loadSettings()
    map.value = initMap()

    initMapFeatures(map.value)

    const { close } = useServerEvents(res => {
        if (res.staff) {
            data.staff = res.staff
        }

        if (res.settings) {
            assignSettingsData(res.settings)
        }

        if (!res.jumprun) return

        if (JSON.stringify(data.jumprun) === JSON.stringify(res.jumprun)) {
            return
        }

        Object.assign(data.jumprun, res.jumprun)

        if (jumprunLayer) {
            jumprunLayer.remove()
        }
        jumprunLayer = L.geoJSON(
            createJumprunData(
                data.jumprun.start,
                data.jumprun.end,
                data.jumprun.shift,
                data.jumprun.angle,
            ),
            { style: { color: '#00ff00', weight: 6, opacity: 1 } },
        ).addTo(map.value)
    }, isConnected)
    serverEventsClose = close

    replaceCanopyCircleLayer()
    replaceDriftBoxLayer()
    replaceLeadLineLayer()
})

onUnmounted(() => {
    serverEventsClose?.()
    map.value?.remove()
    canopyCircleLayer = null
    driftBoxLayer = null
    leadLineLayer = null
})
</script>

<template>
    <div :class="$style.map">
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
                :manifest-phone="settingsData.manifestPhone"
                :separation="settingsData.separation"
                :calculated-separation="exitSeparation"
                :canopy-circle="canopyCircle"
                :drift-box="freefallDrift"
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
.map {
    width: 100vw;
    height: 100vh;
}

.mapBox {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 0;
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

/* Info box as a full-height left column so the map never renders under it */
@media (min-width: 769px) {
    .mapContainer {
        display: grid;
        grid-template-columns: auto 1fr;
    }

    .mapBox {
        order: 2;
    }
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

/* Move the connection indicator off the info box sidebar onto the map */
@media (min-width: 769px) {
    .connectionMessage {
        left: 452px;
    }
}
</style>
