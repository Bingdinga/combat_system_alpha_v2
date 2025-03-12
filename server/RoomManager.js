class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> { players: Map<socketId, playerData> }
    this.socketToRoom = new Map(); // socketId -> roomId
  }

  // Join a player to a room
  joinRoom(socket, username, roomId, characterClass) {
    // Check if player is already in a room
    if (this.socketToRoom.has(socket.id)) {
      this.leaveRoom(socket);
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        players: new Map(),
        inCombat: false
      });
    }

    const room = this.rooms.get(roomId);

    // Don't allow joining rooms in combat
    if (room.inCombat) {
      socket.emit('roomError', { message: 'Cannot join room: Combat in progress' });
      return;
    }

    // Add player to room
    const playerData = {
      id: socket.id,
      username: username,
      characterClass: characterClass || null,
      ready: false
    };

    room.players.set(socket.id, playerData);
    this.socketToRoom.set(socket.id, roomId);

    // Join socket to room
    socket.join(roomId);

    // Notify player they've joined
    socket.emit('roomJoined', {
      roomId: roomId,
      playerId: socket.id,
      players: Array.from(room.players.values())
    });

    // Notify others of new player
    socket.to(roomId).emit('playerJoined', playerData);

    console.log(`Player ${username} (${socket.id}) joined room ${roomId} as ${characterClass || 'No Class'}`);
  }

  // Remove a player from their room
  leaveRoom(socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    // Get the room
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Get player data before removal
    const playerData = room.players.get(socket.id);

    // Remove player from room
    room.players.delete(socket.id);
    this.socketToRoom.delete(socket.id);

    // Leave socket room
    socket.leave(roomId);

    // Notify others of player leaving
    if (playerData) {
      socket.to(roomId).emit('playerLeft', { id: socket.id });
      console.log(`Player ${playerData.username} (${socket.id}) left room ${roomId}`);
    }

    // Check if room is empty, and clean up if so
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
  }

  // Handle disconnection (same as leaving room)
  handleDisconnect(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Get player data
    const playerData = room.players.get(socketId);

    // Remove player
    room.players.delete(socketId);
    this.socketToRoom.delete(socketId);

    // Notify others
    if (playerData) {
      this.io.to(roomId).emit('playerLeft', { id: socketId });
      console.log(`Player ${playerData.username} (${socketId}) disconnected from room ${roomId}`);
    }

    // Clean up empty rooms
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty after disconnect)`);
    }
  }

  // Get all players in a room
  getPlayersInRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.players.values());
  }

  // Get room ID for a socket
  getSocketRoom(socketId) {
    return this.socketToRoom.get(socketId);
  }

  // Get player data by socket ID
  getPlayerData(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    return room.players.get(socketId);
  }

  // Set room combat status
  setRoomCombatStatus(roomId, inCombat) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.inCombat = inCombat;
    }
  }

  // Check if room is in combat
  isRoomInCombat(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.inCombat : false;
  }
}

module.exports = RoomManager;