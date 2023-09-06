const express = require('express')
const app = express()
const port = 3007

app.use(express.json())

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    )
    next()
})

// Route expressjs to assets in dist folder
app.use(express.static('../dist'))

app.listen(port, () => {
    console.log(`Jump run app listening on port ${port}`)
})
