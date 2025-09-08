// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://client-six-gamma-54.vercel.app/", // React app URL
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    
    // Check if room is full
    if (room.size >= 2) {
      socket.emit('room-error', { message: 'Room is full' });
      return;
    }
    
    room.add(socket.id);
    
    // Notify others in room
    socket.to(roomId).emit('user-joined', { userId: socket.id });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      userId: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      userId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      userId: socket.id
    });
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    handleUserLeave(socket, roomId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from all rooms
    rooms.forEach((room, roomId) => {
      if (room.has(socket.id)) {
        handleUserLeave(socket, roomId);
      }
    });
  });
});

function handleUserLeave(socket, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
  
  socket.to(roomId).emit('user-left', { userId: socket.id });
  socket.leave(roomId);
  
  console.log(`User ${socket.id} left room ${roomId}`);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});