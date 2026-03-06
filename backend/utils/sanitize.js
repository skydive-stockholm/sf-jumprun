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
        }
    }

    return result
}
