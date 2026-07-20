<script setup>
import { computed } from 'vue'
import JumpRunWeather from './JumpRunWeather.vue'

const props = defineProps({
    staff: {
        type: Object,
        required: true,
    },
    jumprun: {
        type: [Object],
        required: false,
        default: null,
    },
    manifestPhone: {
        type: String,
        default: '',
    },
    separation: {
        type: String,
        default: '',
    },
    calculatedSeparation: {
        type: Object,
        default: null,
    },
    canopyCircle: {
        type: Object,
        default: null,
    },
    driftBox: {
        type: Object,
        default: null,
    },
})

const DEFAULT_SEPARATION = 'Small groups: 8s · Large groups: 12s'

// Time from first to last exit point at the current groundspeed.
const runTime = computed(() => {
    const j = props.jumprun
    const s = props.calculatedSeparation
    if (!j || !s || !(s.planeGroundSpeed > 0)) return null

    const lengthM = (Number(j.end) - Number(j.start)) * 1852
    if (!Number.isFinite(lengthM) || lengthM <= 0) return null

    return {
        seconds: Math.round(lengthM / s.planeGroundSpeed),
        groundSpeedKt: Math.round(s.planeGroundSpeed / 0.514444),
    }
})
</script>

<template>
    <section :class="$style.infoBox">
        <slot />

        <JumpRunWeather />

        <div v-if="jumprun" :class="$style.jumpRunData">
            <div>
                <span :class="[$style.indicator, $style.indicatorGreen]"></span>
                <span>&nbsp;</span>
                <span>{{ jumprun.start.toFixed(2) }} nm</span>
            </div>

            <div>---------</div>

            <div>
                <span :class="[$style.indicator, $style.indicatorRed]"></span>
                <span>&nbsp;</span>
                <span>{{ jumprun.end.toFixed(2) }} nm</span>
            </div>
        </div>

        <div v-if="jumprun" :class="$style.greenLightNote">
            The green light turns on 10 seconds before first exit — the
            yellow start of the jump run line.
        </div>

        <div v-if="jumprun">
            <strong>Jump run heading:</strong>
            <span>&nbsp;</span>
            <span>{{ jumprun.angle }}&deg;</span>
        </div>

        <div v-if="runTime">
            <strong>Time on run:</strong>
            <span>&nbsp;</span>
            <span>
                {{ runTime.seconds }} s ({{ runTime.groundSpeedKt }} kt
                groundspeed)
            </span>
        </div>

        <div>
            <strong>Separation</strong>

            <div :class="$style.separation">
                {{ separation || DEFAULT_SEPARATION }}
            </div>
        </div>

        <div v-if="driftBox" :class="$style.canopyLegend">
            <span :class="$style.driftLegendIcon"></span>
            <div>
                <strong>Drift box</strong>
                ({{ driftBox.distance }} nm drift)
                <div :class="$style.canopyLegendText">
                    Where jumpers are expected to open their parachutes: the
                    jump run from the first exit point, moved by the freefall
                    wind drift and the forward throw from the aircraft.
                </div>
            </div>
        </div>

        <div v-if="canopyCircle" :class="$style.canopyLegend">
            <span :class="$style.canopyLegendIcon"></span>
            <div>
                <strong>Canopy return area</strong>
                ({{ canopyCircle.radius }} nm radius)
                <div :class="$style.canopyLegendText">
                    Jumpers who open inside the dashed circle can still fly
                    back to the landing area. It sits upwind and moves with
                    the wind.
                </div>
            </div>
        </div>

        <div :class="$style.staffContainer">
            <div :class="$style.staffRow">
                <strong>Jump leader:</strong>
                <span>&nbsp;</span>
                <span v-if="staff?.jumpLeader">{{ staff.jumpLeader }}</span>
            </div>

            <div :class="$style.staffRow">
                <strong>Manifest:</strong>
                <span>&nbsp;</span>
                <span v-if="staff?.manifestor">{{ staff.manifestor }}</span>
            </div>

            <div :class="$style.staffRow">
                <strong>Pilot:</strong>
                <span>&nbsp;</span>
                <span v-if="staff?.pilot">{{ staff.pilot }}</span>
            </div>

            <div v-if="manifestPhone">
                <strong>Manifest:</strong>
                <span>&nbsp;</span>
                <span>{{ manifestPhone }}</span>
            </div>

            <div :class="$style.staffRow">
                <span>jumprun.skydive.se</span>
            </div>
        </div>
    </section>
</template>

<style module>
.infoBox {
    z-index: 1000;
    color: #ececec;
    background: #1b1b1b;
    padding: 20px 10px;
    bottom: 0;
    border-top-right-radius: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    font-size: 19px;
}

@media (min-width: 768px) {
    .infoBox {
        width: 442px;
        height: 100%;
        overflow-y: auto;
        gap: 20px;
        border-top-right-radius: 0;
    }
}

@media (max-width: 767px) {
    .infoBox {
        position: relative;
        font-size: 14px;
        width: 100%;
        gap: 12px;
    }
}

.indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 9999px;
}

.indicatorRed {
    background-color: red;
}

.indicatorGreen {
    background-color: green;
}

.jumpRunData {
    display: flex;
    justify-content: space-between;
}

.greenLightNote {
    font-size: 0.8em;
    color: #b5b5b5;
}

.staffContainer {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

@media (max-width: 767px) {
    .staffRow {
        display: none;
    }
}

.separation {
    margin-top: 4px;
}

.canopyLegend {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.canopyLegendIcon {
    flex: none;
    width: 20px;
    height: 20px;
    margin-top: 4px;
    border: 2px dashed #38bdf8;
    border-radius: 50%;
    background: rgba(56, 189, 248, 0.12);
}

.driftLegendIcon {
    flex: none;
    width: 20px;
    height: 20px;
    margin-top: 4px;
    border: 2px dashed #facc15;
    background: rgba(250, 204, 21, 0.12);
}

.canopyLegendText {
    margin-top: 4px;
    font-size: 0.8em;
    color: #b5b5b5;
}
</style>
