<script setup>
import JumpRunWeather from './JumpRunWeather.vue'

defineProps({
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

        <div v-if="jumprun">
            <strong>Jump run heading:</strong>
            <span>&nbsp;</span>
            <span>{{ jumprun.angle }}&deg;</span>
        </div>

        <div v-if="separation">
            <strong>Separation</strong>

            <div :class="$style.separation">
                {{ separation }}
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
    padding: 20px 15px;
    bottom: 0;
    border-top-right-radius: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    font-size: 19px;
}

@media (min-width: 768px) {
    .infoBox {
        position: fixed;
        width: 442px;
        gap: 20px;
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
</style>
