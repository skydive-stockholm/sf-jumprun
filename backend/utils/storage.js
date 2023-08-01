const fs = require('fs')
const path = require('path')
const filePath = path.join(__dirname + '/..', 'data.json')

const storage = {
    fetch: () => {
        const json = fs.readFileSync(filePath).toString()
        return JSON.parse(json)
    },
    save: data => {
        fs.writeFileSync(filePath, JSON.stringify(data))
    },
}

module.exports = {
    storage,
}
