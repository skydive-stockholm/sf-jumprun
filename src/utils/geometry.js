import turfCircle from "@turf/circle"
import coordinates from '../data/coordinates.js'

export const createLineFeature = (map, direction) => {
    const id = 'line-' + direction

    let sourceCoordinates = []

    if (direction === 'x') {
        sourceCoordinates = [
            [coordinates.gropen[0] + 0.0505, coordinates.gropen[1]],
            [coordinates.gropen[0] - 0.0505, coordinates.gropen[1]],
        ]
    }

    if (direction === 'y') {
        sourceCoordinates = [
            [coordinates.gropen[0], coordinates.gropen[1] + 0.0505],
            [coordinates.gropen[0], coordinates.gropen[1] - 0.0505],
        ]
    }

    map.addSource(id, {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': sourceCoordinates
            }
        }
    });

    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': redLine
    });
}

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
