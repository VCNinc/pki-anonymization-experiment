const WebSocket = require('ws')
const uuid = require('uuid-random')

const Application = require('./Application')
const Reconstitution = require('./Reconstitution')
const SingleValueConsensus = require('./SingleValueConsensus')

const node = (port) => {
  const me = 'ws://localhost:' + port
  const peers = new Set()

  const wss = new WebSocket.Server({ port: port, perMessageDeflate: false })

  const seen = new Set()

  let app

  function report (data) {
    sws.send(JSON.stringify({ type: 're', data: data }))
  }

  function dandelion (data) {
    const id = uuid()
    const all = Array.from(peers)
    const random = all[Math.floor(Math.random() * all.length)]
    const message = JSON.stringify({
      id: id,
      message: data,
      stem: all.length
    })
    random.send(message)
  }

  function gossip (data) {
    const id = uuid()
    seen.add(id)
    const message = JSON.stringify({
      id: id,
      message: data,
      stem: 0
    })
    peers.forEach((peer) => {
      peer.send(message)
    })
    app.deliver(data)
  }

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      const data = JSON.parse(message)
      if (data.stem > 0) {
        const all = Array.from(peers)
        const random = all[Math.floor(Math.random() * all.length)]
        data.stem--
        random.send(JSON.stringify(data))
      } else {
        if (!seen.has(data.id)) {
          seen.add(data.id)
          peers.forEach((peer) => {
            peer.send(message)
          })
          app.deliver(data.message)
        }
      }
    })
  })

  const sws = new WebSocket('ws://localhost:8080')
  sws.on('open', () => {
    sws.send(JSON.stringify({ type: 'hello', data: me }))
  })
  sws.on('message', (message) => {
    const data = JSON.parse(message)
    if (data.type === 'exit') return process.exit()
    const neighbors = data.peers
    if (data.app === 'app') app = new Application(gossip, dandelion, report, me)
    if (data.app === 'reconstitution') app = new Reconstitution(gossip, dandelion, report, me)
    if (data.app === 'single-value-consensus') app = new SingleValueConsensus(gossip, dandelion, report, me)
    app.total = data.total
    const promises = []
    neighbors.forEach((neighbor) => {
      promises.push(new Promise((resolve, reject) => {
        const ws = new WebSocket(neighbor)
        ws.on('open', () => {
          peers.add(ws)
          resolve()
        })
      }))
    })
    Promise.all(promises).then(async () => {
      const input = await app.input()
      sws.send(JSON.stringify({ type: 'wc', data: me, input: input }))
    })
  })
}

for (let i = 0; i < 256; i++) {
  node(15000 + i)
}
