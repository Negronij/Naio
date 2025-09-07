const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname)); // Sirve todos los archivos

const rooms = {}; // Salas y sus usuarios

io.on('connection', socket => {
  console.log('Usuario conectado:', socket.id);

  socket.on('join-room', room => {
    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(socket.id);

    // Avisar a otros usuarios de la sala
    socket.to(room).emit('user-joined', socket.id);

    // Manejar señalización
    socket.on('signal', ({ to, data }) => {
      io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('disconnect', () => {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
    });

    socket.join(room);
  });
});

http.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));
