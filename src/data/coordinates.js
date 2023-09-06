function getMapCenter() {
    const viteMapCenter = import.meta.env.VITE_MAP_CENTER

    if (!viteMapCenter) {
        throw new Error('Environment variable VITE_MAP_CENTER is not set')
    }

    return viteMapCenter.replace(' ', '').split(',').map(parseFloat)
}

export default {
    mapCenter: getMapCenter(),
}
