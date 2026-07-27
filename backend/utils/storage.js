import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultPath = path.join(__dirname, '..', 'data.json')

export function createStorage(filePath = defaultPath) {
    return {
        fetch() {
            try {
                return JSON.parse(fs.readFileSync(filePath).toString())
            } catch (error) {
                if (error.code === 'ENOENT' || error instanceof SyntaxError) {
                    fs.writeFileSync(filePath, JSON.stringify({}))
                    return {}
                }
                throw error
            }
        },
        save(data) {
            fs.writeFileSync(filePath, JSON.stringify(data))
        },
    }
}

// The jump run is per-session: a stored one is dropped on boot so the public
// view stays empty until the jump leader sets it.
export function clearJumprun(storage) {
    const data = storage.fetch()
    if (!('jumprun' in data)) return false
    delete data.jumprun
    storage.save(data)
    return true
}

export default createStorage()
