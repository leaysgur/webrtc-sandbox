const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 4000 });

wss.on('connection', function connection(ws) {
  console.log('connect');

  ws.on('message', function incoming(message) {
      console.log('received: %s', message);
    });

  ws.send('something');
});
