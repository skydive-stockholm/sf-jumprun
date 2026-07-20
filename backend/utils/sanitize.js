const WIND_ALTITUDES = ['600', '1500', '3000']

function sanitizeManualWinds(manual) {
    if (!manual || typeof manual !== 'object') return null

    const result = {}
    for (const altitude of WIND_ALTITUDES) {
        const row = manual[altitude]
        if (!row || typeof row !== 'object') continue
        const wind = Number(row.wind)
        const windDegrees = Number(row.windDegrees)
        if (!Number.isFinite(wind) || !Number.isFinite(windDegrees)) continue
        result[altitude] = { wind, windDegrees }
    }
    return Object.keys(result).length > 0 ? result : null
}

export function sanitizeStorage(body) {
    const result = {}

    if (body.staff) {
        result.staff = {
            manifestor: String(body.staff.manifestor || ''),
            jumpLeader: String(body.staff.jumpLeader || ''),
            pilot: String(body.staff.pilot || ''),
        }
    }

    if (body.jumprun) {
        result.jumprun = {
            start: Number(body.jumprun.start) || 0,
            end: Number(body.jumprun.end) || 0,
            shift: Number(body.jumprun.shift) || 0,
            angle: Number(body.jumprun.angle) || 0,
        }
    }

    if (body.settings) {
        result.settings = {
            mapboxApiKey: String(body.settings.mapboxApiKey || ''),
            mapCenter: String(body.settings.mapCenter || ''),
            manifestPhone: String(body.settings.manifestPhone || ''),
            separation: String(body.settings.separation || ''),
            exitAltitude: String(body.settings.exitAltitude || ''),
            openingAltitude: String(body.settings.openingAltitude || ''),
            aircraftSpeed: String(body.settings.aircraftSpeed || ''),
            manualWindsAloft: sanitizeManualWinds(
                body.settings.manualWindsAloft,
            ),
        }
    }

    return result
}
