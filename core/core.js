const WebSocket = require('ws');
const express = require('express');
var uuid = require('uuid-random');
const mathjs = require('mathjs')
const app = express();

const nodes = new Set();
const wc = new Set();
const wss = new WebSocket.Server({ port: 8080, perMessageDeflate: false });
var reports = [];
wss.on('connection', (ws) => {
  let obj = {ws: ws};
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'hello') {
      obj.url = message.data;
      nodes.add(obj);
    } else if (message.type === 'wc') {
      wc.add(obj);
    } else if (message.type === 're') {
      reports.push(message.data);
    }
  });
  ws.on('close', () => {
    nodes.delete(obj);
    wc.delete(obj);
  });
});

app.get('/spread', (req, res) => {
  let all = Array.from(nodes);
  const target = 32;
  all.forEach((node) => {
    let peers = new Set();
    while (peers.size < target) {
      let random = all[Math.floor(Math.random()*all.length)].url;
      if (random != node.url) {
        peers.add(random);
      }
    }
    peers = Array.from(peers);
    node.ws.send(JSON.stringify({peers: peers, total: all.length, app: 'app'}));
  });
  res.sendStatus(200);
});

function aggregate(data) {
  return {
    mean: mathjs.mean(data),
    std: mathjs.std(data),
    min: mathjs.min(data),
    max: mathjs.max(data),
    median: mathjs.median(data),
    count: data.length
  };
}

app.get('/reports/get', (req, res) => {
  let aggregates = {times: {total: [], events: {}}, results: {}};
  for (let event in reports[0].times.events) {
    aggregates.times.events[event] = [];
  }
  for (let result in reports[0].results) {
    aggregates.results[result] = [];
  }
  for (let report of reports) {
    aggregates.times.total.push(report.times.end - report.times.start);
    for (let event in report.times.events) {
      aggregates.times.events[event].push(report.times.events[event].end - report.times.events[event].start);
    }
    for (let result in report.results) {
      aggregates.results[result].push(report.results[result]);
    }
  }
  aggregates.times.total = aggregate(aggregates.times.total);
  for (let event in reports[0].times.events) {
    aggregates.times.events[event] = aggregate(aggregates.times.events[event]);
  }
  for (let result in reports[0].results) {
    aggregates.results[result] = aggregate(aggregates.results[result]);
  }
  res.send({aggregates: aggregates, reports: reports});
});
app.get('/start', (req, res) => {
  reports = [];
  let all = Array.from(nodes);
  let random = all[Math.floor(Math.random()*all.length)].url;
  const sws = new WebSocket(random);
  sws.on('open', () => {
    sws.send(JSON.stringify({
      id: uuid(),
      message: {
        route: 'start',
        data: 'start'
      },
      stem: 32
    }));
  });
  res.sendStatus(200);
});
app.get('/status', (req, res) => {
  res.send({
    c: nodes.size,
    wc: wc.size,
    r: reports.length
  })
});
app.listen(3000);

setInterval(() => {
  console.clear();
  console.log('Nodes connected: ', nodes.size);
  console.log('Nodes well-connected: ', wc.size);
  console.log('Nodes reporting: ', reports.length);
}, 200);
