<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
    createCircleData,
    createLineData,
    createJumprunData,
    getTextPosition,
} from '../utils/geometry.js'
import { setMapCenter } from '../data/coordinates.js'
import { addBaseLayer } from '../utils/baseLayer.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import { useServerEvents } from '../composables/useServerEvents.js'
import { useDragHandles } from '../composables/useDragHandles.js'
import ViewToggle from './ViewToggle.vue'
import UpdateNotification from './UpdateNotification.vue'
import SettingsPanel from './SettingsPanel.vue'
import OnboardingScreen from './OnboardingScreen.vue'

const isConnected = ref(false)
const showSettings = ref(false)
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

const hasUnsavedChanges = ref(false)
const isDragging = ref(false)
let dragHandles = null
let jumprunLayer = null

const settings = reactive({ mapCenter: '' })
const settingsData = reactive({ manifestPhone: '', separation: '' })
const needsOnboarding = ref(false)

const toggleSettings = () => {
    showSettings.value = !showSettings.value
}

async function loadSettings() {
    try {
        const res = await fetch('http://localhost:3008/api/storage')
        const stored = await res.json()
        if (stored.settings) {
            settings.mapCenter = stored.settings.mapCenter || ''
            settingsData.manifestPhone = stored.settings.manifestPhone || ''
            settingsData.separation = stored.settings.separation || ''
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
    })

    addBaseLayer(m)

    return m
}

function replaceJumprunLayer(start, end, shift, angle) {
    if (jumprunLayer) {
        jumprunLayer.remove()
    }
    jumprunLayer = L.geoJSON(createJumprunData(start, end, shift, angle), {
        style: { color: '#00ff00', weight: 6, opacity: 1 },
    }).addTo(map.value)
}

async function onSettingsSaved({ staff, settings: newSettings }) {
    if (staff) {
        Object.assign(data.staff, staff)
    }

    settingsData.manifestPhone = newSettings.manifestPhone || ''
    settingsData.separation = newSettings.separation || ''

    if (newSettings.mapCenter && newSettings.mapCenter !== settings.mapCenter) {
        settings.mapCenter = newSettings.mapCenter
        serverEventsClose?.()
        dragHandles?.remove()
        map.value?.remove()
        await nextTick()
        startMap()
    }
}

async function completeOnboarding() {
    needsOnboarding.value = false
    await loadSettings()
    await nextTick()
    startMap()
}

function initMapFeatures(m) {
    for (let i = 0.1; i <= 1.5; i = i + 0.1) {
        const isHighlight =
            Math.abs(i - 0.5) < 0.01 ||
            Math.abs(i - 1.0) < 0.01 ||
            Math.abs(i - 1.5) < 0.01
        const style = isHighlight
            ? { color: '#ff6d04', weight: 3, opacity: 0.7, fillOpacity: 0 }
            : { color: '#000000', weight: 2, opacity: 0.5, fillOpacity: 0 }
        L.geoJSON(createCircleData(i), { style }).addTo(m)
    }

    ;['x', 'y'].forEach((axis) => {
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

function startMap() {
    map.value = initMap()

    initMapFeatures(map.value)

    dragHandles = useDragHandles(map.value, data.jumprun, {
        hasUnsavedChanges,
        isDragging,
        onJumprunUpdate: replaceJumprunLayer,
    })
    dragHandles.init()

    const { close } = useServerEvents((res) => {
        if (!res.jumprun) return

        if (res.staff) {
            data.staff = res.staff
        }

        if (isDragging.value || hasUnsavedChanges.value) return

        if (JSON.stringify(data.jumprun) === JSON.stringify(res.jumprun)) {
            return
        }

        Object.assign(data.jumprun, res.jumprun)

        replaceJumprunLayer(
            data.jumprun.start,
            data.jumprun.end,
            data.jumprun.shift,
            data.jumprun.angle,
        )

        dragHandles?.updatePositions()
    }, isConnected)
    serverEventsClose = close
}

onMounted(async () => {
    await loadSettings()

    if (!settings.mapCenter && window.electronAPI) {
        needsOnboarding.value = true
        return
    }

    startMap()
})

onUnmounted(() => {
    serverEventsClose?.()
    dragHandles?.remove()
    map.value?.remove()
})

const save = () => {
    const raw = { staff: { ...data.staff }, jumprun: { ...data.jumprun } }
    fetch('http://localhost:3009/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(raw),
    })
    hasUnsavedChanges.value = false
}
</script>

<template>
    <OnboardingScreen v-if="needsOnboarding" @complete="completeOnboarding" />
    <div v-else :class="$style.map">
        <UpdateNotification />
        <img
            src="../assets/north-arrow.svg"
            alt="Compass"
            :class="$style.compass"
        />

        <SettingsPanel
            v-if="showSettings"
            :staff="data.staff"
            @save="onSettingsSaved"
            @close="toggleSettings"
        />

        <div :class="$style.mapContainer">
            <div id="map" :class="$style.mapBox"></div>

            <JumpRunInfoBox
                :staff="data.staff || null"
                :jumprun="data.jumprun || null"
                :manifest-phone="settingsData.manifestPhone"
                :separation="settingsData.separation"
            />
        </div>

        <button :class="$style.settingsButton" @click="toggleSettings">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Settings
        </button>

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
        <ViewToggle />
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

.settingsButton {
    position: fixed;
    z-index: 1000;
    bottom: 20px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    backdrop-filter: blur(4px);
}

.settingsButton:hover {
    background: rgba(0, 0, 0, 0.85);
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
