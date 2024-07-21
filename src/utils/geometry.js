import turfCircle from '@turf/circle'
import coordinates from '../data/coordinates.js'
import * as turf from '@turf/turf'

export function addTextToMap(
    map,
    text,
    angle = 0,
    distance = 0.5,
    options = {},
) {
    const id = `text-${Math.random().toString(36).substr(2, 9)}` // Generate a unique ID

    // Calculate the position 1 nautical mile from the map center
    const point = turf.point(coordinates.mapCenter)
    const destination = turf.destination(point, distance, angle, {
        units: 'nauticalmiles',
    })
    const textCoordinates = destination.geometry.coordinates

    // Add a GeoJSON source with a single point feature
    map.addSource(id, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: textCoordinates,
                    },
                    properties: {
                        text: text,
                    },
                },
            ],
        },
    })

    // Add a symbol layer to render the text
    map.addLayer({
        id: id,
        type: 'symbol',
        source: id,
        layout: {
            'text-field': ['get', 'text'],
            'text-size': options.size || 25,
            'text-anchor': options.anchor || 'center',
            'text-offset': options.offset || [0, 0],
            'text-rotate': options.rotate || 0,
        },
        paint: {
            'text-color': options.color || '#000000',
            'text-halo-color': options.haloColor || '#ffffff',
            'text-halo-width': options.haloWidth || 1.8,
        },
    })

    // Return the layer ID in case you need to modify or remove it later
    return id
}

export const createLineFeature = (map, direction) => {
    const id = 'line-' + direction

    let sourceCoordinates = []

    if (direction === 'x') {
        sourceCoordinates = [
            [coordinates.mapCenter[0] + 0.047, coordinates.mapCenter[1]],
            [coordinates.mapCenter[0] - 0.047, coordinates.mapCenter[1]],
        ]
    }

    if (direction === 'y') {
        sourceCoordinates = [
            [coordinates.mapCenter[0], coordinates.mapCenter[1] + 0.0233],
            [coordinates.mapCenter[0], coordinates.mapCenter[1] - 0.0233],
        ]
    }

    map.addSource(id, {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: sourceCoordinates,
            },
        },
    })

    map.addLayer({
        id: id,
        type: 'line',
        source: id,
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
        },
        paint: primaryLine,
    })
}

export const createCircleFeature = (map, nauticalMiles, color) => {
    const circle = createCircle(nauticalMiles)
    const id = 'circle-' + nauticalMiles.toString()

    map.addSource(id, {
        type: 'geojson',
        data: circle,
    })

    // Add a new layer to visualize the polygon.
    map.addLayer({
        id: id,
        type: 'line',
        source: id,
        layout: {},
        paint: getPaint(color),
    })
}

const jrHelper = (start, end, shift, angle) => {
    const p1 = turf.transformTranslate(
        turf.point(coordinates.mapCenter),
        start * 1852,
        angle,
        { units: 'meters' },
    )
    const p2 = turf.transformTranslate(
        turf.point(coordinates.mapCenter),
        end * 1852,
        angle,
        { units: 'meters' },
    )
    const p3 = turf.transformTranslate(p2, 100, angle + 150, {
        units: 'meters',
    })
    const p4 = turf.transformTranslate(p3, 100, angle - 90, { units: 'meters' })
    const jr = turf.lineString(
        [
            p1.geometry.coordinates,
            p2.geometry.coordinates,
            p3.geometry.coordinates,
            p4.geometry.coordinates,
            p2.geometry.coordinates,
        ],
        { name: 'line 2' },
    )

    return turf.transformTranslate(jr, shift * 1852, angle + 90, {
        units: 'meters',
    })
}

// function createTextFeature(map, text, coordinates) {
//     const el = document.createElement('div')
//     el.innerHTML = text
//     el.className = 'marker'
//     el.style.color = 'white'
//     el.style.margin = '20px'
//     el.style.fontSize = '20px'
//     el.style.textShadow = '2px 2px 4px #000000'
//
//     // make a marker for each feature and add it to the map
//     return new mapboxgl.Marker(el).setLngLat(coordinates).addTo(map)
// }

/**
 *
 * @param map
 * @param start
 * @param end
 * @param shift
 * @param angle
 */
export const createJumprunFeature = (map, start, end, shift, angle) => {
    const id = 'jumprun'

    const jr = jrHelper(start, end, shift, angle)
    map.addSource(id, {
        type: 'geojson',
        data: jr,
    })

    // Add a new layer to visualize the polygon.
    map.addLayer({
        id: id,
        type: 'line',
        source: id,
        layout: {
            'line-join': 'round',
            'line-cap': 'round',
        },
        paint: {
            'line-width': 6,
            'line-color': '#00ff00',
            'line-opacity': 1,
        },
    })

    return jr
}

export const updateJumpRun = (map, start, end, shift, angle) => {
    const jr = jrHelper(start, end, shift, angle)

    map.getSource('jumprun').setData(jr)
}

const createCircle = (nauticalMiles = 0.1) => {
    const radius = nauticalMiles * 1852 // nautical miles in meters
    const options = { steps: 0, units: 'meters' }

    return turfCircle(coordinates.mapCenter, radius, options)
}

const getPaint = color => {
    switch (color) {
        case 'red':
            return primaryLine
        case 'black':
            return blackLine
        default:
            return null
    }
}

const primaryLine = {
    'line-width': 3,
    'line-color': '#ff6d04',
    'line-opacity': 0.7,
}

const blackLine = {
    'line-width': 2,
    'line-color': '#000000',
    'line-opacity': 0.5,
}
