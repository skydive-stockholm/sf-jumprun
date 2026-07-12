import L from 'leaflet'

const mapboxToken = import.meta.env.VITE_MAPBOX_API_KEY

export function addBaseLayer(map) {
    const scale = L.Browser.retina ? '@2x' : ''

    const layer = mapboxToken
        ? L.tileLayer(
              `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}${scale}.jpg90?access_token=${mapboxToken}`,
              {
                  attribution: '&copy; Mapbox &copy; Maxar',
                  maxZoom: 22,
                  updateWhenIdle: true,
                  keepBuffer: 2,
              },
          )
        : L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              {
                  attribution: 'Tiles &copy; Esri',
                  maxZoom: 19,
                  updateWhenIdle: true,
                  keepBuffer: 2,
              },
          )

    layer.addTo(map)

    // Tiles that failed to load while the network was down stay grey forever
    // unless we re-request them. Retry on tile errors and when the browser
    // reports the connection is back.
    let retryTimer = null
    layer.on('tileerror', () => {
        if (retryTimer) return
        retryTimer = setTimeout(() => {
            retryTimer = null
            layer.redraw()
        }, 5000)
    })

    const handleOnline = () => layer.redraw()
    window.addEventListener('online', handleOnline)

    map.on('unload', () => {
        window.removeEventListener('online', handleOnline)
        if (retryTimer) clearTimeout(retryTimer)
    })

    return layer
}
