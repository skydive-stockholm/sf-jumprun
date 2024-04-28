<script setup>
import JumpRunWeather from './JumpRunWeather.vue'

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
</script>

<template>
    <section :class="$style.infoBox">
        <slot />

        <!-- Weather data -->
        <JumpRunWeather />

        <!-- Jump run data -->
        <div :class="$style.jumpRunData">
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

        <div>
            <strong>Jum run heading:</strong>
            <span>&nbsp;</span>
            <span>{{ jumprun.angle }}°</span>
        </div>

        <!-- Staff -->
        <div :class="$style.staffContainer">
            <div>
                <strong>Jump leader:</strong>
                <span>&nbsp;</span>
                <span>{{ staff.jumpLeader }}</span>
            </div>

            <div>
                <strong>Manifestor:</strong>
                <span>&nbsp;</span>
                <span>{{ staff.manifestor }}</span>
            </div>

            <div>
                <strong>Pilot:</strong>
                <span>&nbsp;</span>
                <span>{{ staff.pilot }}</span>
            </div>

            <div>
                <strong>Manifest:</strong>
                <span>&nbsp;</span>
                <span>+4676 135 43 85</span>
            </div>
        </div>
    </section>
</template>

<style module>
.infoBox {
    position: fixed;
    z-index: 10;
    color: #ececec;
    background: #1b1b1b;
    padding: 20px 15px;
    bottom: 0;
    border-top-right-radius: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: flex;
    gap: 20px;
    flex-direction: column;
    width: 420px;
    font-size: 19px;
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
</style>
