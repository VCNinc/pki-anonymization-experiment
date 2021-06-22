const WebSocket = require('ws');
var uuid = require('uuid-random');

const node = (port) => {
  const me = 'ws://localhost:' + port;
  const peers = new Set();

  const wss = new WebSocket.Server({ port: port, perMessageDeflate: false });

  const seen = new Set();

  function dandelion(data) {
    const id = uuid();
    seen.add(id);
    let all = Array.from(peers);
    let random = all[Math.floor(Math.random()*all.length)];
    const message = JSON.stringify({
      id: id,
      message: data,
      stem: all.length
    });
    random.send(JSON.stringify(data));
  }

  function gossip(data) {
    const id = uuid();
    seen.add(id);
    const message = JSON.stringify({
      id: id,
      message: data,
      stem: 0
    });
    peers.forEach((peer) => {
      peer.send(message);
    });
  }

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      data = JSON.parse(message);
      console.log(message);
      if (data.stem > 0) {
        let all = Array.from(peers);
        let random = all[Math.floor(Math.random()*all.length)];
        data.stem--;
        random.send(JSON.stringify(data));
      } else {
        if (!seen.has(data.id)) {
          seen.add(data.id);
          peers.forEach((peer) => {
            peer.send(message);
          });
        }
      }
    })
  });

  const sws = new WebSocket('ws://localhost:8080');
  sws.on('open', () => {
    sws.send(JSON.stringify({type: 'hello', data: me}));
  });
  sws.on('message', (message) => {
    let neighbors = message.split(';');
    let promises = [];
    neighbors.forEach((neighbor) => {
      promises.push(new Promise((resolve, reject) => {
        const ws = new WebSocket(neighbor);
        ws.on('open', () => {
          peers.add(ws);
          resolve();
        });
      }));
    });
    Promise.all(promises).then(() => {
      sws.send(JSON.stringify({type: 'wc', data: me}));
    });
  });
}

for (let i = 0; i < 100; i++) {
  node(4000 + i);
}
