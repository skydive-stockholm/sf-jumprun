// Writes go to the private port. The public port is read-only, so the copy
// served through the reverse proxy on jumprun.skydive.se cannot be changed —
// only clients that can reach the private port, i.e. the drop-zone network,
// may publish a jump run or change settings.
export const WRITE_PORT = 3009

export async function saveStorage(payload) {
    const res = await fetch(
        `${location.protocol}//${location.hostname}:${WRITE_PORT}/api/storage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    if (!res.ok) throw new Error(`server responded ${res.status}`)
}
