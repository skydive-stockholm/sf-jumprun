const directions = [
    { name: 'N', dir: [348.75, 11.25] },
    { name: 'NNE', dir: [11.25, 33.75] },
    { name: 'NE', dir: [33.75, 56.25] },
    { name: 'ENE', dir: [56.25, 78.75] },
    { name: 'E', dir: [78.75, 101.25] },
    { name: 'ESE', dir: [101.25, 123.75] },
    { name: 'SE', dir: [123.75, 146.25] },
    { name: 'SSE', dir: [146.25, 168.75] },
    { name: 'S', dir: [168.75, 191.25] },
    { name: 'SSW', dir: [191.25, 213.75] },
    { name: 'SW', dir: [213.75, 236.25] },
    { name: 'WSW', dir: [236.25, 258.75] },
    { name: 'W', dir: [258.75, 281.25] },
    { name: 'WNW', dir: [281.25, 303.75] },
    { name: 'NW', dir: [303.75, 326.25] },
    { name: 'NNW', dir: [326.25, 348.75] },
]

export function windDirection(deg) {
    if (deg < 11.25 || deg > 348.75) return directions[0]
    return directions.find(item => item.dir[0] <= deg && deg <= item.dir[1])
}

export function roundNumber(val) {
    return Math.round(val * 10) / 10
}
