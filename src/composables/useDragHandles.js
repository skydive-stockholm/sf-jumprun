import L from 'leaflet'
import {
    calcJumpRunParams,
    calcShiftFromMidpoint,
    getJumpRunEndpoints,
} from '../utils/geometry.js'

function createDragHandle(color) {
    return L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background-color:${color};border:3px solid white;cursor:grab;box-shadow:0 0 6px rgba(0,0,0,0.5)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    })
}

export function useDragHandles(
    mapInstance,
    jumprunData,
    { hasUnsavedChanges, isDragging, onJumprunUpdate },
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
        startMarker.setLatLng([ep.start[1], ep.start[0]])
        endMarker.setLatLng([ep.end[1], ep.end[0]])
        midMarker.setLatLng([ep.mid[1], ep.mid[0]])
    }

    function init() {
        const endpoints = getJumpRunEndpoints(
            jumprunData.start,
            jumprunData.end,
            jumprunData.shift,
            jumprunData.angle,
        )

        startMarker = L.marker([endpoints.start[1], endpoints.start[0]], {
            icon: createDragHandle('#00ff00'),
            draggable: true,
        }).addTo(mapInstance)

        endMarker = L.marker([endpoints.end[1], endpoints.end[0]], {
            icon: createDragHandle('#ff0000'),
            draggable: true,
        }).addTo(mapInstance)

        midMarker = L.marker([endpoints.mid[1], endpoints.mid[0]], {
            icon: createDragHandle('#ffffff'),
            draggable: true,
        }).addTo(mapInstance)

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
            const sl = startMarker.getLatLng()
            const el = endMarker.getLatLng()
            const params = calcJumpRunParams(
                [sl.lng, sl.lat],
                [el.lng, el.lat],
                jumprunData.angle,
            )
            Object.assign(jumprunData, params)
            onJumprunUpdate(params.start, params.end, params.shift, params.angle)
            const ep = getJumpRunEndpoints(
                params.start,
                params.end,
                params.shift,
                params.angle,
            )
            midMarker.setLatLng([ep.mid[1], ep.mid[0]])
        })

        endMarker.on('drag', () => {
            const sl = startMarker.getLatLng()
            const el = endMarker.getLatLng()
            const params = calcJumpRunParams(
                [sl.lng, sl.lat],
                [el.lng, el.lat],
                jumprunData.angle,
            )
            Object.assign(jumprunData, params)
            onJumprunUpdate(params.start, params.end, params.shift, params.angle)
            const ep = getJumpRunEndpoints(
                params.start,
                params.end,
                params.shift,
                params.angle,
            )
            midMarker.setLatLng([ep.mid[1], ep.mid[0]])
        })

        midMarker.on('drag', () => {
            const ml = midMarker.getLatLng()
            const shift = calcShiftFromMidpoint(
                [ml.lng, ml.lat],
                jumprunData.angle,
            )
            jumprunData.shift = shift
            onJumprunUpdate(
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
            startMarker.setLatLng([ep.start[1], ep.start[0]])
            endMarker.setLatLng([ep.end[1], ep.end[0]])
        })
    }

    function remove() {
        startMarker?.remove()
        endMarker?.remove()
        midMarker?.remove()
    }

    return { init, updatePositions, remove }
}
