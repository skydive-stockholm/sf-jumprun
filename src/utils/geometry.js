import turfCircle from "@turf/circle"
import coordinates from '../data/coordinates.js'

export const createCircleFeature = (map, nauticalMiles, color) => {
    const circle = createCircle(nauticalMiles)
    const id = 'line-' + nauticalMiles.toString();

    map.addSource(id, {
        'type': 'geojson',
        'data': circle
    });

    // Add a new layer to visualize the polygon.
    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'layout': {},
        'paint': getPaint(color)
    });
}

const createCircle = (nauticalMiles = 0.1) => {
    const radius = nauticalMiles * 1852 // nautical miles in meters
    const options = {steps: 0, units: 'meters'}

    return turfCircle(coordinates.gropen, radius, options)
}

const getPaint = (color) => {
    switch (color) {
        case 'red':
            return redLine
        case 'black':
            return blackLine
        default:
            return null
    }
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
