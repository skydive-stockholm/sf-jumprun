import L from 'leaflet'

const mapboxToken = import.meta.env.VITE_MAPBOX_API_KEY

export function addBaseLayer(map) {
    if (mapboxToken) {
        return L.tileLayer(
            `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${mapboxToken}`,
            {
                attribution: '&copy; Mapbox &copy; Maxar',
                maxZoom: 22,
            },
        ).addTo(map)
    }

    return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri', maxZoom: 19 },
    ).addTo(map)
}
