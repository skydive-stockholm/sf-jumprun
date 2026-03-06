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

export default createStorage()
