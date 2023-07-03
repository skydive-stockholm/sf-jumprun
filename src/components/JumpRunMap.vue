<script setup>
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {onMounted} from "vue";

mapboxgl.accessToken = 'pk.eyJ1Ijoic2t5ZGl2ZXN0b2NraG9sbSIsImEiOiJjbGptenN0OXIwMXNzM3VxaWNhYXptZWkzIn0.W18BZYntAkco7TaPL9XtOw'

onMounted(() => {
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [17.426210, 60.284040],
        zoom: 14.5,
    });
})

</script>

<template>
  <div>
      <div :class="$style.map" id="map"></div>
  </div>
</template>

<style module>
.map {
    width: 100vw;
    height: 100vh;
}
</style>
