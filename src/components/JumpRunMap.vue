<script setup>
// Vue imports
import {onMounted} from "vue";
import axios from "axios";

// Mapbox imports
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
mapboxgl.accessToken = 'pk.eyJ1Ijoic2t5ZGl2ZXN0b2NraG9sbSIsImEiOiJjbGptenN0OXIwMXNzM3VxaWNhYXptZWkzIn0.W18BZYntAkco7TaPL9XtOw'

// Application imports
import {createCircleFeature, createLineFeature, createJumprunFeature,updateJumpRun} from "../utils/geometry.js";
import coordinates from '../data/coordinates.js'

onMounted(() => {
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: coordinates.gropen,
        zoom: 14,
    });

    map.on('load', () => {
        createCircleFeature(map, 0.1, 'black')
        createCircleFeature(map, 0.2, 'black')
        createCircleFeature(map, 0.3, 'black')
        createCircleFeature(map, 0.4, 'black')
        createCircleFeature(map, 0.5, 'red')
        createCircleFeature(map, 0.6, 'black')
        createCircleFeature(map, 0.7, 'black')
        createCircleFeature(map, 0.8, 'black')
        createCircleFeature(map, 0.9, 'black')
        createCircleFeature(map, 1, 'red')
        createCircleFeature(map, 1.1, 'black')
        createCircleFeature(map, 1.2, 'black')
        createCircleFeature(map, 1.3, 'black')
        createCircleFeature(map, 1.4, 'black')
        createCircleFeature(map, 1.5, 'red')

        createLineFeature(map, 'x')
        createLineFeature(map, 'y')
		
		createJumprunFeature(map,-0.5,0.5,0,30);

		setInterval(function(){
			axios.get("http://"+window.location.hostname+":8080/control.json")
			.then(response => {
				updateJumpRun(map,response.data.start/2048,response.data.end/2048,response.data.shift/4096,response.data.angle);
			});
		},100);
    })
})

</script>

<template>
  <div :class="$style.map">
      <img src="../assets/north-arrow.svg" alt="Compass" :class="$style.compass">
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
</style>
