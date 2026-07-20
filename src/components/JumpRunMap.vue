<script setup>
import {
    computed,
    nextTick,
    onMounted,
    onUnmounted,
    reactive,
    ref,
    useCssModule,
    watch,
} from 'vue'
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
import { useDragHandles } from '../composables/useDragHandles.js'
import {
    useWeatherAloft,
    applyManualWindsSetting,
} from '../composables/useWeatherAloft.js'
import { useWeather } from '../composables/useWeather.js'
import {
    calculateJumpRunSuggestion,
    calculateExitSeparation,
    calculateCanopyCircle,
    calculateFreefallDrift,
    isSignificantlyDifferent,
    SUGGESTION_DEFAULTS,
    GREEN_LIGHT_LEAD,
    MIN_RUN_LENGTH,
    MAX_RUN_LENGTH,
} from '../utils/jumprunSuggestion.js'

const sparkleIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e9d5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>'
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

const style = useCssModule()
const weatherAloft = useWeatherAloft()
const groundWeather = useWeather()
let suggestionLayer = null
let suggestionButton = null
let renderedSuggestionKey = null
const suggestionDismissed = ref(false)
const showSuggestionInfo = ref(false)

const suggestionConfig = computed(() => {
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

const suggestion = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateJumpRunSuggestion(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        suggestionConfig.value,
    )
})

const exitSeparation = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateExitSeparation(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        data.jumprun.angle,
        suggestionConfig.value,
    )
})

let canopyCircleLayer = null
const canopyCircle = computed(() => {
    if (!weatherAloft.hasData) return null
    return calculateCanopyCircle(
        Object.values(weatherAloft.current),
        groundWindInput.value,
        suggestionConfig.value,
    )
})

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
        suggestionConfig.value,
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

const acceptSuggestion = () => {
    if (!suggestion.value) return

    Object.assign(data.jumprun, suggestion.value)

    const { start, end, shift, angle } = data.jumprun
    replaceJumprunLayer(start, end, shift, angle)
    dragHandles?.updatePositions()
    hasUnsavedChanges.value = true
}

function removeSuggestionLayer() {
    suggestionLayer?.remove()
    suggestionLayer = null
    suggestionButton?.remove()
    suggestionButton = null
    renderedSuggestionKey = null
}

function replaceSuggestionLayer() {
    if (isDragging.value) return

    const s = suggestion.value
    const visible =
        map.value &&
        s &&
        !suggestionDismissed.value &&
        isSignificantlyDifferent(s, data.jumprun)
    const key = visible ? JSON.stringify(s) : null
    if (key === renderedSuggestionKey) return

    removeSuggestionLayer()
    renderedSuggestionKey = key
    if (!visible) return

    suggestionLayer = L.geoJSON(
        createJumprunData(s.start, s.end, s.shift, s.angle),
        {
            style: { color: '#00ff00', weight: 6, opacity: 0.5 },
        },
    ).addTo(map.value)

    const { mid } = getJumpRunEndpoints(s.start, s.end, s.shift, s.angle)
    suggestionButton = L.marker([mid[1], mid[0]], {
        icon: L.divIcon({
            className: '',
            html:
                `<div class="${style.suggestionControls}">` +
                `<button data-accept class="${style.aiButton}">${sparkleIcon}Accept suggestion</button>` +
                `<div class="${style.suggestionSideButtons}">` +
                `<button data-dismiss class="${style.roundButton} ${style.dismissButton}">&times;</button>` +
                `<button data-info class="${style.roundButton} ${style.infoButton}">?</button>` +
                '</div>' +
                '</div>',
            iconAnchor: [-25, 15],
        }),
    }).addTo(map.value)

    const el = suggestionButton.getElement()
    L.DomEvent.disableClickPropagation(el)
    el.querySelector('[data-accept]').addEventListener(
        'click',
        acceptSuggestion,
    )
    el.querySelector('[data-dismiss]').addEventListener('click', () => {
        suggestionDismissed.value = true
    })
    el.querySelector('[data-info]').addEventListener('click', () => {
        showSuggestionInfo.value = true
    })
}

watch(
    [suggestion, () => ({ ...data.jumprun }), isDragging, suggestionDismissed],
    replaceSuggestionLayer,
)

// Keep the run in view: long runs can extend well past the map center.
function recenterOnJumprun() {
    if (!map.value || isDragging.value) return
    const { start, end, shift, angle } = data.jumprun
    const points = getJumpRunEndpoints(start, end, shift, angle)
    const bounds = L.latLngBounds([
        [points.start[1], points.start[0]],
        [points.end[1], points.end[0]],
    ])
    map.value.fitBounds(bounds, { padding: [150, 150], maxZoom: 15.5 })
}

watch([() => ({ ...data.jumprun }), isDragging], ([, dragging]) => {
    if (!dragging) recenterOnJumprun()
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
const needsOnboarding = ref(false)

const toggleSettings = () => {
    showSettings.value = !showSettings.value
}

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

    assignSettingsData(newSettings)

    if (newSettings.mapCenter && newSettings.mapCenter !== settings.mapCenter) {
        settings.mapCenter = newSettings.mapCenter
        serverEventsClose?.()
        dragHandles?.remove()
        map.value?.remove()
        map.value = null
        suggestionLayer = null
        suggestionButton = null
        renderedSuggestionKey = null
        canopyCircleLayer = null
        driftBoxLayer = null
        leadLineLayer = null
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

function startMap() {
    map.value = initMap()

    initMapFeatures(map.value)

    dragHandles = useDragHandles(map.value, data.jumprun, {
        hasUnsavedChanges,
        isDragging,
        onJumprunUpdate: replaceJumprunLayer,
    })
    dragHandles.init()

    const { close } = useServerEvents(res => {
        if (res.staff) {
            data.staff = res.staff
        }

        if (res.settings) {
            assignSettingsData(res.settings)
        }

        if (!res.jumprun) return

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

    replaceSuggestionLayer()
    replaceCanopyCircleLayer()
    replaceDriftBoxLayer()
    replaceLeadLineLayer()
    recenterOnJumprun()
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
    map.value = null
    canopyCircleLayer = null
    driftBoxLayer = null
    leadLineLayer = null
})

const save = () => {
    const raw = { staff: { ...data.staff }, jumprun: { ...data.jumprun } }
    fetch(`${location.protocol}//${location.hostname}:3009/api/storage`, {
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
                :calculated-separation="exitSeparation"
                :canopy-circle="canopyCircle"
                :drift-box="freefallDrift"
            />
        </div>

        <button :class="$style.settingsButton" @click="toggleSettings">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                />
                <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
        </button>

        <button
            v-if="hasUnsavedChanges"
            :class="$style.saveButton"
            @click="save"
        >
            Save jump run
        </button>

        <div
            v-if="showSuggestionInfo"
            :class="$style.modalOverlay"
            @click.self="showSuggestionInfo = false"
        >
            <div :class="$style.modal">
                <button
                    :class="$style.modalClose"
                    @click="showSuggestionInfo = false"
                >
                    &times;
                </button>
                <h2 :class="$style.modalTitle">
                    How the jump run is calculated
                </h2>
                <p>
                    The suggested jump run is calculated automatically from the
                    latest winds aloft forecast (600, 1500 and 3000 m) and the
                    current ground wind.
                </p>
                <ul :class="$style.modalList">
                    <li>
                        <strong>Heading</strong> — the direction of the
                        speed-weighted average wind through the column, so
                        strong upper winds count for more than a light ground
                        breeze. The jump run is flown into the wind.
                    </li>
                    <li>
                        <strong>Exit point</strong> — the average wind between
                        opening altitude ({{
                            suggestionConfig.openingAltitude
                        }}
                        m) and exit altitude ({{
                            suggestionConfig.exitAltitude
                        }}
                        m), multiplied by the time in freefall, gives the
                        freefall drift. The ideal exit point is that drift
                        upwind of the target — sideways drift becomes the run's
                        lateral shift — minus the forward throw.
                    </li>
                    <li>
                        <strong>Forward throw</strong> — when you exit, you
                        leave with the aircraft's ground speed and keep
                        travelling along the jump run for a few seconds before
                        air resistance slows you down to drifting with the wind.
                        This carries you roughly 4 seconds of ground speed
                        (100–200 m) past the point where you left the plane, so
                        the ideal exit point is moved that far back along the
                        run to compensate. The stronger the headwind, the lower
                        the ground speed and the shorter the throw.
                    </li>
                    <li>
                        <strong>Run length</strong> — how far a canopy (13 m/s
                        airspeed, 6.5 m/s descent) can still fly back to the
                        target from opening altitude. Flying home downwind is
                        fast and crawling home against the wind is slow, so the
                        window extends further on the upwind side of the ideal
                        exit. A safety margin is applied and the run is kept
                        between {{ MIN_RUN_LENGTH }} and
                        {{ MAX_RUN_LENGTH }} nm.
                    </li>
                    <li>
                        <strong>Green light</strong> — turned on
                        {{ GREEN_LIGHT_LEAD }} seconds of flight before the
                        first exit point, since nobody leaves exactly on the
                        light. This lead is drawn as the yellow start of the
                        jump run line. Distances use the aircraft's ~{{
                            suggestionConfig.aircraftSpeedKt
                        }}
                        kt jump run speed minus the headwind component at
                        altitude.
                    </li>
                    <li>
                        <strong>Yellow dashed box</strong> — the drift box:
                        where jumpers are expected to open their parachutes. It
                        is the jump run from the first exit point (the
                        green-light lead is skipped) translated by the freefall
                        wind drift and the forward throw, padded ~150 m on all
                        sides for tracking and scatter.
                    </li>
                    <li>
                        <strong>Blue dashed circle</strong> — the canopy return
                        area: anyone open inside it can still make it back to
                        the target. Its radius is the distance a canopy covers
                        during its descent from opening altitude, and it sits
                        upwind of the target by the wind drift over the same
                        descent, with the same safety margin as the run length.
                    </li>
                </ul>
                <p>
                    Based on the "Determining the Exit Point" method from
                    Skydive The Ranch and the APF "Exit Separation" thesis by
                    Steven Geens. The suggestion is a starting point — always
                    verify against actual conditions before use.
                </p>
                <h3 :class="$style.modalSubtitle">The math</h3>
                <div :class="$style.modalMath">
                    <div>
                        heading = direction of speed-weighted mean wind, 0–{{
                            suggestionConfig.exitAltitude
                        }}
                        m (flown into the wind)
                    </div>
                    <div>
                        freefall time = ({{ suggestionConfig.exitAltitude }} −
                        {{ suggestionConfig.openingAltitude }}) / 55 m/s
                    </div>
                    <div>
                        drift = mean wind ({{
                            suggestionConfig.openingAltitude
                        }}–{{ suggestionConfig.exitAltitude }} m) × freefall
                        time
                    </div>
                    <div>
                        ground speed = {{ suggestionConfig.aircraftSpeedKt }}
                        kt − headwind at exit altitude (min 20 m/s)
                    </div>
                    <div>forward throw = ground speed × 4 s</div>
                    <div>
                        ideal exit = drift × cos(Δ) − forward throw, upwind of
                        target
                    </div>
                    <div>
                        shift = drift × sin(Δ), where Δ = drift direction −
                        heading
                    </div>
                    <div>
                        canopy time = ({{ suggestionConfig.openingAltitude }} −
                        150 m opening loss) / 6.5 m/s descent
                    </div>
                    <div>
                        run window = (13 m/s ∓ canopy headwind) × canopy time ×
                        0.6 margin, per side, clamped to
                        {{ MIN_RUN_LENGTH }}–{{ MAX_RUN_LENGTH }} nm
                    </div>
                    <div>
                        start = ideal exit − downwind window − ground speed ×
                        {{ GREEN_LIGHT_LEAD }} s green light lead
                    </div>
                    <div>end = ideal exit + upwind window</div>
                    <div>
                        drift box = jump run after green light lead + drift +
                        forward throw, ±150 m scatter
                    </div>
                    <div>
                        exit separation = 300 m (groups &lt; 4) or 500 m (groups
                        4–10) / (plane ground speed − canopy ground speed)
                    </div>
                </div>
            </div>
        </div>

        <button
            v-if="
                suggestionDismissed &&
                suggestion &&
                isSignificantlyDifferent(suggestion, data.jumprun)
            "
            :class="[$style.aiButton, $style.restoreButton]"
            @click="suggestionDismissed = false"
        >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="sparkleIcon"></span>
            Show suggestion
        </button>

        <button
            :class="[
                $style.roundButton,
                $style.infoButton,
                $style.cornerInfoButton,
            ]"
            title="How the jump run is calculated"
            @click="showSuggestionInfo = true"
        >
            ?
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

.modalOverlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
}

.modal {
    position: relative;
    max-width: 520px;
    max-height: 80vh;
    overflow-y: auto;
    margin: 20px;
    padding: 25px 30px;
    background: #1b1b1b;
    color: #ececec;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 15px;
    line-height: 1.5;
}

.modalTitle {
    margin: 0;
    font-size: 19px;
    padding-right: 30px;
}

.modalList {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.modalSubtitle {
    margin: 8px 0 0;
    font-size: 16px;
}

.modalMath {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.4;
    color: #c9c9c9;
}

.modalClose {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    padding: 0;
    background: rgba(255, 255, 255, 0.1);
    color: #ececec;
    border: none;
    border-radius: 50%;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
}

.modalClose:hover {
    background: rgba(255, 255, 255, 0.2);
}

.aiButton {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background:
        linear-gradient(rgba(10, 10, 15, 0.85), rgba(10, 10, 15, 0.85))
            padding-box,
        linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b) border-box;
    border: 2px solid transparent;
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    backdrop-filter: blur(4px);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
}

.restoreButton {
    position: fixed;
    z-index: 1000;
    bottom: 120px;
    right: 20px;
}

.cornerInfoButton {
    position: fixed;
    z-index: 1000;
    bottom: 70px;
    right: 20px;
}

.suggestionControls {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.suggestionSideButtons {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.roundButton {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 50%;
    color: #fff;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.dismissButton {
    background: #e5484d;
}

.infoButton {
    background: #6b7280;
}

@keyframes pulse {
    0%,
    100% {
        transform: translateX(-50%) scale(1);
        box-shadow: 0 0 10px rgba(74, 138, 244, 0.5);
    }
    50% {
        transform: translateX(-50%) scale(1.05);
        box-shadow:
            0 0 30px rgba(74, 138, 244, 0.9),
            0 0 60px rgba(74, 138, 244, 0.4);
    }
}

/* Move fixed overlays off the info box sidebar onto the map */
@media (min-width: 769px) {
    .connectionMessage {
        left: 452px;
    }

    .settingsButton {
        left: 462px;
    }
}
</style>
