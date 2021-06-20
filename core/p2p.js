// Core
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, perMessageDeflate: false });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log(data);
  });
});
