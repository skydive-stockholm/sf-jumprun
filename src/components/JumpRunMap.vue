<script setup>
import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import {onMounted} from "vue";
import turfCircle from "@turf/circle"

mapboxgl.accessToken = 'pk.eyJ1Ijoic2t5ZGl2ZXN0b2NraG9sbSIsImEiOiJjbGptenN0OXIwMXNzM3VxaWNhYXptZWkzIn0.W18BZYntAkco7TaPL9XtOw'

const coordinates = {
    gropen: [17.426200, 60.284040],
}

const createCircle = (nauticalMiles = 0.1) => {
    const radius = nauticalMiles * 1852 // nautical miles in meters
    const options = {steps: 0, units: 'meters'}

    return turfCircle(coordinates.gropen, radius, options)
}

const createCircleFeature = (map, nauticalMiles, paint) => {
    const circle = createCircle(nauticalMiles)

    let id = 'line-' + nauticalMiles.toString();
    map.addSource(id, {
        'type': 'geojson',
        'data': circle
    });

    // Add a new layer to visualize the polygon.
    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id, // reference the data source
        'layout': {},
        'paint': paint
    });
}

const redLine = {
    'line-width': 4,
    'line-color': '#ff0000',
    'line-opacity': 0.5,
}

const blackLine = {
    'line-width': 2,
    'line-color': '#000000',
    'line-opacity': 0.5,
}

onMounted(() => {
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: coordinates.gropen,
        zoom: 14,
    });

    map.on('load', () => {
        createCircleFeature(map, 0.1, blackLine)
        createCircleFeature(map, 0.2, blackLine)
        createCircleFeature(map, 0.3, blackLine)
        createCircleFeature(map, 0.4, blackLine)
        createCircleFeature(map, 0.5, redLine)
        createCircleFeature(map, 0.6, blackLine)
        createCircleFeature(map, 0.7, blackLine)
        createCircleFeature(map, 0.8, blackLine)
        createCircleFeature(map, 0.9, blackLine)
        createCircleFeature(map, 1, redLine)
    })
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
