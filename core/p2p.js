const WebSocket = require('ws');
const express = require('express');
var uuid = require('uuid-random');
const app = express();

const nodes = new Set();
const wc = new Set();
const wss = new WebSocket.Server({ port: 8080, perMessageDeflate: false });
wss.on('connection', (ws) => {
  let obj = {ws: ws};
  ws.on('message', (message) => {
    message = JSON.parse(message);
    if (message.type === 'hello') {
      obj.url = message.data;
      nodes.add(obj);
    } else if (message.type === 'wc') {
      wc.add(obj);
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
    peers = Array.from(peers).join(';');
    node.ws.send(peers);
  });
  res.sendStatus(200);
});
app.get('/gossip', (req, res) => {
  let all = Array.from(nodes);
  let random = all[Math.floor(Math.random()*all.length)].url;
  const sws = new WebSocket(random);
  sws.on('open', () => {
    sws.send(JSON.stringify({
      id: uuid(),
      message: req.query.m,
      stem: 32
    }));
  });
  res.sendStatus(200);
});
app.listen(3000);

setInterval(() => {
  console.clear();
  console.log('Nodes connected: ', nodes.size);
  console.log('Nodes well-connected: ', wc.size);
}, 200);
