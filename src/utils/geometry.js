import turfCircle from "@turf/circle"
import coordinates from '../data/coordinates.js'
import * as turf from '@turf/turf'
import mapboxgl from "mapbox-gl";

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
            [coordinates.gropen[0], coordinates.gropen[1] + 0.025],
            [coordinates.gropen[0], coordinates.gropen[1] - 0.025],
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
        'paint': primaryLine
    });
}

export const createCircleFeature = (map, nauticalMiles, color) => {
    const circle = createCircle(nauticalMiles)
    const id = 'circle-' + nauticalMiles.toString();

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

var jrHelper = (start,end,shift,angle) => {
	var p1 = turf.transformTranslate(turf.point(coordinates.gropen),start*1852,angle, { units: 'meters' });
	var p2 = turf.transformTranslate(turf.point(coordinates.gropen),end*1852,angle, { units: 'meters' });
	var p3 = turf.transformTranslate(p2,100,angle+150, { units: 'meters' });
	var p4 = turf.transformTranslate(p3,100,angle-90, { units: 'meters' });
	var jr = turf.lineString([p1.geometry.coordinates,p2.geometry.coordinates,p3.geometry.coordinates,p4.geometry.coordinates,p2.geometry.coordinates], {name: 'line 2'});

	return turf.transformTranslate(jr,shift*1852,angle+90, { units: 'meters' } );
}

function createTextFeature(map, text, coordinates) {
    const el = document.createElement('div');
    el.innerHTML = text;
    el.className = 'marker';
    el.style.color = 'white';
    el.style.margin = '20px';
    el.style.fontSize = '20px';
    el.style.textShadow = '2px 2px 4px #000000';

    // make a marker for each feature and add it to the map
    new mapboxgl.Marker(el)
        .setLngLat(coordinates)
        .addTo(map);
}

/**
 *
 * @param map
 * @param start
 * @param end
 * @param shift
 * @param angle
 */
export const createJumprunFeature = (map,start,end,shift,angle) => {
	const id = "jumprun";

	var jr = jrHelper(start,end,shift,angle);
    map.addSource(id, {
        'type': 'geojson',
        'data': jr
    });

    createTextFeature(map, '55s', jr.geometry.coordinates[0]);

    // Add a new layer to visualize the polygon.
    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-width': 6,
            'line-color': '#00ff00',
            'line-opacity': 1,
        }
    });
}

export const updateJumpRun = (map,start,end,shift,angle) => {
	var jr = jrHelper(start,end,shift,angle);

	map.getSource('jumprun').setData(jr)
}

const createCircle = (nauticalMiles = 0.1) => {
    const radius = nauticalMiles * 1852 // nautical miles in meters
    const options = {steps: 0, units: 'meters'}

    return turfCircle(coordinates.gropen, radius, options)
}

const getPaint = (color) => {
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
