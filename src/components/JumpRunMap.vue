<script setup>
// Vue imports
import { onMounted, onUnmounted, ref } from 'vue'
import axios from 'axios'

// Mapbox imports
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
// Application imports
import {
    createCircleFeature,
    createJumprunFeature,
    createLineFeature,
    updateJumpRun,
} from '../utils/geometry.js'
import coordinates from '../data/coordinates.js'
import JumpRunInfoBox from './JumpRunInfoBox.vue'
import AdminPanel from '../AdminPanel.vue'

const adminDialog = ref(null)
const toggleAdminDialog = () => {
    if (adminDialog.value.open) {
        adminDialog.value.close()
    } else {
        adminDialog.value.showModal()
    }
}

mapboxgl.accessToken =
    'pk.eyJ1Ijoic2t5ZGl2ZXN0b2NraG9sbSIsImEiOiJjbGptenN0OXIwMXNzM3VxaWNhYXptZWkzIn0.W18BZYntAkco7TaPL9XtOw'

const map = ref(null)

const controlHandler = () => {
    axios.get('http://127.0.0.1:3008/api/storage').then(response => {
        console.log(response)
        updateJumpRun(
            map.value,
            response.data.jumprun.start,
            response.data.jumprun.end,
            response.data.jumprun.shift,
            response.data.jumprun.angle,
        )
    })
}

onMounted(() => {
    map.value = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: coordinates.gropen,
        zoom: 13.5,
    })

    map.value.on('load', () => {
        createCircleFeature(map.value, 0.1, 'black')
        createCircleFeature(map.value, 0.2, 'black')
        createCircleFeature(map.value, 0.3, 'black')
        createCircleFeature(map.value, 0.4, 'black')
        createCircleFeature(map.value, 0.5, 'red')
        createCircleFeature(map.value, 0.6, 'black')
        createCircleFeature(map.value, 0.7, 'black')
        createCircleFeature(map.value, 0.8, 'black')
        createCircleFeature(map.value, 0.9, 'black')
        createCircleFeature(map.value, 1, 'red')
        createCircleFeature(map.value, 1.1, 'black')
        createCircleFeature(map.value, 1.2, 'black')
        createCircleFeature(map.value, 1.3, 'black')
        createCircleFeature(map.value, 1.4, 'black')
        createCircleFeature(map.value, 1.5, 'red')

        createLineFeature(map.value, 'x')
        createLineFeature(map.value, 'y')

        createJumprunFeature(map.value, -0.5, 0.5, 0, 30)

        setInterval(controlHandler, 500)
    })

    onUnmounted(() => {
        map.value.remove()
        clearInterval(controlHandler)
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
        <button :class="$style.openAdminDialog" @click="toggleAdminDialog">
            Admin
        </button>

        <JumpRunInfoBox />

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
    width: 150px;
}

.infoBox {
    position: fixed;
    z-index: 10;
    background: #fff;
    color: #000;
    padding: 20px 15px;
    bottom: 0;
    border-top-right-radius: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
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

.openAdminDialog {
    position: absolute;
    top: 0;
    left: 0;
    margin: 20px;
    z-index: 100;
}
</style>
