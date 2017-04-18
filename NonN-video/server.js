const server = require('http').Server();
const io = require('socket.io')(server);

io.on('connection', socket => {
  console.log('newConn', socket.id);

  socket.on('join', () => {
    socket.broadcast.emit('join', { id: socket.id });
  });
  socket.on('leave', () => {
    socket.broadcast.emit('leave', { id: socket.id });
  });

  socket.on('message', data => {
    const to = data.to;
    if (to) {
      delete data.to;
      socket.broadcast.to(to).emit('message', data);
      return;
    }
    socket.broadcast.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('disConn', socket.id);
    socket.broadcast.emit('leave', { id: socket.id });
  });
});

server.listen(3000);
console.log('server started');
