const WebSocket = require('ws')
const uuid = require('uuid-random')
const crypto = require('crypto')

const Application = require('./Application')
const Reconstitution = require('./Reconstitution')
const SingleValueConsensus = require('./SingleValueConsensus')
const Benchmark = require('./Benchmark')
const FastBenchmark = require('./FastBenchmark')
const SingleChatRoomPKIA = require('./SingleChatRoomPKIA')

const node = (port, myip = 'localhost', remotelocation = 'ws://172.31.18.37:8080') => {
  const me = 'ws://' + myip + ':' + port
  const peers = new Set()
  const database = new Map()

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

  function threephase (data) {
    const hash = crypto.createHash('sha1').update(JSON.stringify(data)).digest('base64')
    database.set(hash, data)
    const id = uuid()
    seen.add(id)
    const message = JSON.stringify({
      id: id,
      type: 'tell',
      hash: hash,
      route: data.route
    })
    peers.forEach((peer) => {
      peer.send(message)
    })
    app.udeliver(id, hash, data.route)
  }

  const waiting = {}

  function waitForHash (hash) {
    return new Promise((resolve, reject) => {
      if (database.has(hash)) {
        resolve()
      } else {
        waiting[hash].push(resolve)
      }
    })
  }

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      const data = JSON.parse(message)
      if (data.type === 'tell') {
        if (!seen.has(data.id)) {
          seen.add(data.id)
          if (!waiting[data.hash]) {
            waiting[data.hash] = []
            ws.send(JSON.stringify({
              type: 'pull',
              hash: data.hash
            }))
          }
          peers.forEach((peer) => {
            peer.send(message)
          })
          waitForHash(data.hash).then(() => {
            app.udeliver(data.id, data.hash, data.route)
          })
        }
      } else if (data.type === 'push') {
        database.set(data.hash, data.data)
        waiting[data.hash].forEach(resolve => resolve())
      } else if (data.stem > 0) {
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

  const sws = new WebSocket(remotelocation)
  sws.on('open', () => {
    sws.send(JSON.stringify({ type: 'hello', data: me }))
  })
  sws.on('message', (message) => {
    const data = JSON.parse(message)
    if (data.type === 'exit') return process.exit()
    const neighbors = data.peers
    if (data.app === 'app') app = new Application(gossip, dandelion, report, me, database, threephase)
    if (data.app === 'reconstitution') app = new Reconstitution(gossip, dandelion, report, me, database, threephase)
    if (data.app === 'benchmark') app = new Benchmark(gossip, dandelion, report, me, database, threephase)
    if (data.app === 'single-value-consensus') app = new SingleValueConsensus(gossip, dandelion, report, me, database, threephase)
    if (data.app === 'fast-benchmark') app = new FastBenchmark(gossip, dandelion, report, me, database, threephase)
    if (data.app === 'single-chat-room-pkia') app = new SingleChatRoomPKIA(gossip, dandelion, report, me, database, threephase)

    app.total = data.total
    const promises = []
    neighbors.forEach((neighbor) => {
      promises.push(new Promise((resolve, reject) => {
        const ws = new WebSocket(neighbor)
        ws.on('open', () => {
          peers.add(ws)
          resolve()
        })
        ws.on('message', (message) => {
          const data = JSON.parse(message)
          if (data.type === 'pull') {
            waitForHash(data.hash).then(() => {
              ws.send(JSON.stringify({ type: 'push', hash: data.hash, data: database.get(data.hash) }))
            })
          }
        })
      }))
    })
    Promise.all(promises).then(async () => {
      const input = await app.input()
      sws.send(JSON.stringify({ type: 'wc', data: me, input: input }))
    })
  })
}

module.exports = node
