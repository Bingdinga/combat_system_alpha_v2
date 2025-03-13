const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

// Import managers
const RoomManager = require('./RoomManager');
const CombatManager = require('./CombatManager');
const { CharacterClasses } = require('./GameClasses');
const { getAllAbilities, getAbilitiesForClass } = require('./Abilities');


// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up static file serving from the public directory
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/classes', (req, res) => {
  res.json(CharacterClasses);
});

// API route to get all abilities
app.get('/api/abilities', (req, res) => {
  res.json(getAllAbilities());
});

// API route to get abilities for a specific class
app.get('/api/abilities/:className', (req, res) => {
  const className = req.params.className.toUpperCase();
  res.json(getAbilitiesForClass(className));
});

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
  socket.on('joinRoom', ({ username, roomId, characterClass }) => {
    roomManager.joinRoom(socket, username, roomId, characterClass);
  });

  socket.on('leaveRoom', () => {
    roomManager.leaveRoom(socket);
  });

  socket.on('startCombat', () => {
    console.log(`Start combat event received from ${socket.id}`);
    const roomId = roomManager.getSocketRoom(socket.id);
    if (roomId) {
      console.log(`Initiating combat in room ${roomId}`);
      combatManager.initiateCombat(roomId);
    } else {
      console.log(`No room found for socket ${socket.id}`);
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