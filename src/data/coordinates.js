const DEFAULT_CENTER = [17.426283, 60.284016]

let currentCenter = [...DEFAULT_CENTER]

export function setMapCenter(center) {
    currentCenter = center
}

export default {
    get mapCenter() {
        return currentCenter
    },
}
