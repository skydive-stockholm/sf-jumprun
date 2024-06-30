import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const filePath = path.join(__dirname + '/..', 'data.json')

export default {
    fetch: () => {
        try {
            const json = fs.readFileSync(filePath).toString()
            return JSON.parse(json)
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, create an empty one
                fs.writeFileSync(filePath, JSON.stringify({}))
                return {}
            }
            throw error // Re-throw if it's a different error
        }
    },
    save: data => {
        const jsonData = JSON.stringify(data)
        fs.writeFileSync(filePath, jsonData)
    },
    onSave: callback => {
        fs.watchFile(filePath, callback)
    },
}
