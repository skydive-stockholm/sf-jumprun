const DEFAULT_CENTER = [17.42929, 60.28519]

let currentCenter = [...DEFAULT_CENTER]

export function setMapCenter(center) {
    currentCenter = center
}

export default {
    get mapCenter() {
        return currentCenter
    },
}
