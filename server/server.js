const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

// Import managers
const RoomManager = require('./RoomManager');
const CombatManager = require('./CombatManager');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up static file serving from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Socket.io with CORS settings
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize managers
const roomManager = new RoomManager(io);
const combatManager = new CombatManager(io, roomManager);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Room events
  socket.on('joinRoom', ({ username, roomId }) => {
    roomManager.joinRoom(socket, username, roomId);
  });

  socket.on('leaveRoom', () => {
    roomManager.leaveRoom(socket);
  });

  socket.on('startCombat', () => {
    const roomId = roomManager.getSocketRoom(socket.id);
    if (roomId) {
      combatManager.initiateCombat(roomId);
    }
  });

  // Combat events
  socket.on('performAction', (actionData) => {
    combatManager.handlePlayerAction(socket.id, actionData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});