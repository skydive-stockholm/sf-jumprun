<template>
    <section :class="$style.infoBox">
        <!--        <button @click.prevent="initSerialPort">Find serial</button>-->

        <slot />

        <div><strong>Last gust (30 min):</strong> {{ lastGust }}</div>

        <div>
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

        <div>
            <div>
                <strong>Green light:</strong>
                {{ jumprun.start.toFixed(2) }} nm
            </div>
            <div>
                <strong>Red light:</strong>
                {{ jumprun.end.toFixed(2) }} nm
            </div>
            <div>
                <strong>Heading:</strong>
                {{ jumprun.angle }}°
            </div>
        </div>
    </section>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
import axios from 'axios'

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

const lastGust = ref(null)

const fetchData = () => {
    return axios.get('https://insidan.skydive.se/api/weather').then(res => {
        lastGust.value = res.data.lastGust30Min
    })
}

fetchData()
const fetcherIntervalId = setInterval(fetchData, 1000)

onUnmounted(() => {
    clearInterval(fetcherIntervalId)
})

// const initSerialPort = async () => {
//     const port = await navigator.serial.requestPort()
//     await port.open({ baudRate: 2400 })
//
//     console.log('connected', port)
//
//     // eslint-disable-next-line
//     const textDecoder = new TextDecoderStream()
//     // eslint-disable-next-line
//     const readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
//     const reader = textDecoder.readable.getReader()
//
//     // Listen to data coming from the serial device.
//     // eslint-disable-next-line
//     while (true) {
//         const { value, done } = await reader.read()
//         if (done) {
//             // Allow the serial port to be closed later.
//             reader.releaseLock()
//             break
//         }
//
//         let string = value
//
//         string = string.replace(/ /g, '"')
//         string = string.replace(/:/g, '":')
//         string = string.replace(/"}/, '}')
//
//         console.log(JSON.parse(string))
//     }
//
//     console.log('foo')
//
//     console.log(port)
// }
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
    width: 320px;
}
</style>
