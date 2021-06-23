const WebSocket = require('ws')
const express = require('express')
const uuid = require('uuid-random')
const mathjs = require('mathjs')
const app = express()

const nodes = new Set()
const wc = new Set()
const wss = new WebSocket.Server({ port: 8080, perMessageDeflate: false })
let reports = []
let inputs = {}
let random
wss.on('connection', (ws) => {
  const obj = { ws: ws }
  ws.on('message', (message) => {
    message = JSON.parse(message)
    if (message.type === 'hello') {
      obj.url = message.data
      nodes.add(obj)
    } else if (message.type === 'wc') {
      wc.add(obj)
      inputs.push(message.input)
    } else if (message.type === 're') {
      reports.push(message.data)
    }
  })
  ws.on('close', () => {
    nodes.delete(obj)
    wc.delete(obj)
  })
})

app.get('/spread', (req, res) => {
  inputs = []
  const target = req.query.target
  const total = req.query.total
  const all = Array.from(nodes).slice(0, total)
  all.forEach((node) => {
    let peers = new Set()
    while (peers.size < target) {
      random = all[Math.floor(Math.random() * all.length)].url
      if (random !== node.url) {
        peers.add(random)
      }
    }
    peers = Array.from(peers)
    node.ws.send(JSON.stringify({ peers: peers, total: all.length, app: req.query.app }))
  })
  res.sendStatus(200)
})

function aggregate (data) {
  return {
    mean: mathjs.mean(data),
    std: mathjs.std(data),
    min: mathjs.min(data),
    max: mathjs.max(data),
    median: mathjs.median(data),
    count: data.length
  }
}

function collapse (data) {
  const collapsed = {}
  for (const res of data) {
    if (!collapsed[res]) collapsed[res] = 0
    collapsed[res]++
  }
  return collapsed
}

app.get('/reports', (req, res) => {
  const aggregates = { times: { total: [], events: {} }, results: {} }
  for (const event in reports[0].times.events) {
    aggregates.times.events[event] = []
  }
  for (const result in reports[0].results) {
    aggregates.results[result] = []
  }
  for (const report of reports) {
    aggregates.times.total.push(report.times.end - report.times.start)
    for (const event in report.times.events) {
      aggregates.times.events[event].push(report.times.events[event].end - report.times.events[event].start)
    }
    for (const result in report.results) {
      aggregates.results[result].push(report.results[result])
    }
  }
  aggregates.times.total = aggregate(aggregates.times.total)
  for (const event in reports[0].times.events) {
    aggregates.times.events[event] = aggregate(aggregates.times.events[event])
  }
  for (const result in reports[0].results) {
    aggregates.results[result] = collapse(aggregates.results[result])
  }
  res.send({ aggregates: aggregates, reports: reports })
})
app.get('/start', (req, res) => {
  const sws = new WebSocket(random)
  sws.on('open', () => {
    sws.send(JSON.stringify({
      id: uuid(),
      message: {
        route: 'start',
        data: inputs
      },
      stem: 32
    }))
  })
  res.sendStatus(200)
})
app.get('/status', (req, res) => {
  res.send({
    connections: nodes.size,
    networks: wc.size,
    reports: reports.length
  })
})
app.get('/reset', (req, res) => {
  reports = []
  inputs = {}
  const all = Array.from(nodes)
  all.forEach((node) => {
    node.ws.send(JSON.stringify({ type: 'exit' }))
  })
  res.sendStatus(200)
})
app.listen(3000)

setInterval(() => {
  console.clear()
  console.log('Nodes connected: ', nodes.size)
  console.log('Nodes well-connected: ', wc.size)
  console.log('Nodes reporting: ', reports.length)
}, 200)
