import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const filePath = path.join(__dirname + '/..', 'data.json')

export default {
    fetch: () => {
        const json = fs.readFileSync(filePath).toString()
        return JSON.parse(json)
    },
    save: data => {
        fs.writeFileSync(filePath, JSON.stringify(data))
    },
    onSave: callback => {
        fs.watchFile(filePath, callback)
    },
}
