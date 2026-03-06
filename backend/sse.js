let clients = []

export function addClient(req, res) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
    }
    res.writeHead(200, headers)

    const clientId = Date.now()
    clients.push({ id: clientId, response: res })

    console.log(`${clientId} Connection opened!`)

    req.on('close', () => {
        console.log(`${clientId} Connection closed`)
        clients = clients.filter(c => c.id !== clientId)
    })

    return clientId
}

export function sendEventsToAll(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`
    clients.forEach(client => client.response.write(message))
}

export function getClientCount() {
    return clients.length
}
