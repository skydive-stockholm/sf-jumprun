import express from 'express'
import storage from './utils/storage.js'
const app = express()
const port = 3008

app.use(express.json())

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    )
    next()
})

app.get('/api/storage', (req, res) => {
    const data = storage.fetch()
    res.send(data)
})

app.post('/api/storage', (req, res) => {
    // Save posted data to storage
    const data = storage.fetch()
    storage.save({ ...data, ...req.body })

    res.send({ message: 'success' })
})

app.listen(port, () => {
    console.log(`Jump run app listening on port ${port}`)
})
