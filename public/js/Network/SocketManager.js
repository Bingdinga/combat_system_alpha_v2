// /public/js/Network/SocketManager.js

export class SocketManager {
  constructor() {
    // Initialize socket connection
    this.socket = io();

    // Event callbacks
    this.eventCallbacks = {};

    // Set up default event listeners
    this.setupDefaultEvents();

    // Log connection status after a short delay to ensure events are registered
    setTimeout(() => {
      console.log('Socket status after initialization:', this.isConnected() ? 'connected' : 'disconnected');
    }, 500);
  }

  // Setup default event listeners
  setupDefaultEvents() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server!');
      this.triggerEvent('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server!');
      this.triggerEvent('disconnect');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.triggerEvent('error', error);
    });

    // Room events
    this.socket.on('roomJoined', (data) => {
      console.log('Joined room:', data.roomId);
      this.triggerEvent('roomJoined', data);
    });

    this.socket.on('roomError', (data) => {
      console.error('Room error:', data.message);
      this.triggerEvent('roomError', data);
    });

    this.socket.on('playerJoined', (data) => {
      console.log('Player joined:', data.username);
      this.triggerEvent('playerJoined', data);
    });

    this.socket.on('playerLeft', (data) => {
      console.log('Player left:', data.id);
      this.triggerEvent('playerLeft', data);
    });

    // Combat events
    this.socket.on('combatInitiated', (data) => {
      console.log('Combat initiated!');
      this.triggerEvent('combatInitiated', data);
    });

    this.socket.on('combatUpdated', (data) => {
      this.triggerEvent('combatUpdated', data);
    });

    this.socket.on('combatEnded', (data) => {
      console.log('Combat ended:', data.result);
      this.triggerEvent('combatEnded', data);
    });
  }

  // Register event callback
  on(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }

    this.eventCallbacks[event].push(callback);
  }

  // Unregister event callback
  off(event, callback) {
    if (!this.eventCallbacks[event]) return;

    if (callback) {
      // Remove specific callback
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    } else {
      // Remove all callbacks for event
      delete this.eventCallbacks[event];
    }
  }

  // Trigger registered callbacks for an event
  triggerEvent(event, data) {
    if (!this.eventCallbacks[event]) return;

    for (const callback of this.eventCallbacks[event]) {
      callback(data);
    }
  }

  joinRoom(username, roomId, characterClass) {
    if (!username || !roomId) {
      console.error('Username and room ID required');
      return;
    }

    this.socket.emit('joinRoom', { username, roomId, characterClass });
  }

  leaveRoom() {
    this.socket.emit('leaveRoom');
  }

  startCombat() {
    this.socket.emit('startCombat');
  }

  // Combat methods
  performAction(actionData) {
    this.socket.emit('performAction', actionData);
  }

  // Utility methods
  getSocketId() {
    return this.socket.id;
  }

  isConnected() {
    return this.socket.connected;
  }
}