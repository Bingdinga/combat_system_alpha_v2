// Network/index.js
import { SocketManager } from './SocketManager.js';

// Create and export a single instance
export const socketManager = new SocketManager();

// Also export the class for testing
export { SocketManager };