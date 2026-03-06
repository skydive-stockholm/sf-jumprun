import mapboxgl from 'mapbox-gl'
import {
    calcJumpRunParams,
    calcShiftFromMidpoint,
    getJumpRunEndpoints,
    updateJumpRun,
} from '../utils/geometry.js'

function createDragHandle(color) {
    const el = document.createElement('div')
    Object.assign(el.style, {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: color,
        border: '3px solid white',
        cursor: 'grab',
        boxShadow: '0 0 6px rgba(0,0,0,0.5)',
    })
    return el
}

export function useDragHandles(
    mapInstance,
    jumprunData,
    { hasUnsavedChanges, isDragging },
) {
    let startMarker, endMarker, midMarker

    function updatePositions() {
        if (!startMarker) return
        const ep = getJumpRunEndpoints(
            jumprunData.start,
            jumprunData.end,
            jumprunData.shift,
            jumprunData.angle,
        )
        startMarker.setLngLat(ep.start)
        endMarker.setLngLat(ep.end)
        midMarker.setLngLat(ep.mid)
    }

    function init() {
        const endpoints = getJumpRunEndpoints(
            jumprunData.start,
            jumprunData.end,
            jumprunData.shift,
            jumprunData.angle,
        )

        startMarker = new mapboxgl.Marker({
            element: createDragHandle('#00ff00'),
            draggable: true,
        })
            .setLngLat(endpoints.start)
            .addTo(mapInstance)

        endMarker = new mapboxgl.Marker({
            element: createDragHandle('#ff0000'),
            draggable: true,
        })
            .setLngLat(endpoints.end)
            .addTo(mapInstance)

        midMarker = new mapboxgl.Marker({
            element: createDragHandle('#ffffff'),
            draggable: true,
        })
            .setLngLat(endpoints.mid)
            .addTo(mapInstance)

        const onDragStart = () => {
            isDragging.value = true
        }
        const onDragEnd = () => {
            isDragging.value = false
            hasUnsavedChanges.value = true
            updatePositions()
        }

        ;[startMarker, endMarker, midMarker].forEach((m) => {
            m.on('dragstart', onDragStart)
            m.on('dragend', onDragEnd)
        })

        startMarker.on('drag', () => {
            const sl = startMarker.getLngLat()
            const el = endMarker.getLngLat()
            const params = calcJumpRunParams(
                [sl.lng, sl.lat],
                [el.lng, el.lat],
                jumprunData.angle,
            )
            Object.assign(jumprunData, params)
            updateJumpRun(
                mapInstance,
                params.start,
                params.end,
                params.shift,
                params.angle,
            )
            midMarker.setLngLat(
                getJumpRunEndpoints(
                    params.start,
                    params.end,
                    params.shift,
                    params.angle,
                ).mid,
            )
        })

        endMarker.on('drag', () => {
            const sl = startMarker.getLngLat()
            const el = endMarker.getLngLat()
            const params = calcJumpRunParams(
                [sl.lng, sl.lat],
                [el.lng, el.lat],
                jumprunData.angle,
            )
            Object.assign(jumprunData, params)
            updateJumpRun(
                mapInstance,
                params.start,
                params.end,
                params.shift,
                params.angle,
            )
            midMarker.setLngLat(
                getJumpRunEndpoints(
                    params.start,
                    params.end,
                    params.shift,
                    params.angle,
                ).mid,
            )
        })

        midMarker.on('drag', () => {
            const ml = midMarker.getLngLat()
            const shift = calcShiftFromMidpoint(
                [ml.lng, ml.lat],
                jumprunData.angle,
            )
            jumprunData.shift = shift
            updateJumpRun(
                mapInstance,
                jumprunData.start,
                jumprunData.end,
                shift,
                jumprunData.angle,
            )
            const ep = getJumpRunEndpoints(
                jumprunData.start,
                jumprunData.end,
                shift,
                jumprunData.angle,
            )
            startMarker.setLngLat(ep.start)
            endMarker.setLngLat(ep.end)
        })
    }

    function remove() {
        startMarker?.remove()
        endMarker?.remove()
        midMarker?.remove()
    }

    return { init, updatePositions, remove }
}
