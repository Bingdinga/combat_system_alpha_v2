// main.js - Client entry point and initialization

// Global state
let combatManager;

// DOM elements
const roomScreen = document.getElementById('room-screen');
const combatScreen = document.getElementById('combat-screen');
const resultScreen = document.getElementById('result-screen');

const loginForm = document.getElementById('login-form');
const roomInfo = document.getElementById('room-info');
const usernameInput = document.getElementById('username');
const roomIdInput = document.getElementById('room-id');
const joinBtn = document.getElementById('join-btn');
const startCombatBtn = document.getElementById('start-combat-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const roomIdDisplay = document.getElementById('room-id-display');
const playerList = document.getElementById('player-list');

// Initialize application
function initialize() {
  // Create combat manager
  combatManager = new CombatManager();
  
  // Setup UI event listeners
  setupEventListeners();
  
  // Setup Socket.io event listeners
  setupSocketListeners();
  
  // Show login form
  showLoginForm();
}

// Setup UI event listeners
function setupEventListeners() {
  // Join room button
  joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    
    if (!username || !roomId) {
      alert('Please enter a username and room ID');
      return;
    }
    
    // Join room
    socketManager.joinRoom(username, roomId);
  });
  
  // Start combat button
  startCombatBtn.addEventListener('click', () => {
    socketManager.startCombat();
  });
  
  // Leave room button
  leaveRoomBtn.addEventListener('click', () => {
    socketManager.leaveRoom();
    showLoginForm();
  });
}

// Setup Socket.io event listeners
function setupSocketListeners() {
  // Room joined event
  socketManager.on('roomJoined', (data) => {
    // Update room info
    roomIdDisplay.textContent = data.roomId;
    updatePlayerList(data.players);
    
    // Show room info
    showRoomInfo();
  });
  
  // Player joined event
  socketManager.on('playerJoined', (playerData) => {
    addPlayerToList(playerData);
  });
  
  // Player left event
  socketManager.on('playerLeft', (data) => {
    removePlayerFromList(data.id);
  });
  
  // Room error event
  socketManager.on('roomError', (data) => {
    alert(`Error: ${data.message}`);
  });
}

// Show login form
function showLoginForm() {
  loginForm.classList.remove('hidden');
  roomInfo.classList.add('hidden');
  
  // Reset input fields
  usernameInput.value = '';
  roomIdInput.value = '';
  
  // Clear player list
  playerList.innerHTML = '';
}

// Show room info
function showRoomInfo() {
  loginForm.classList.add('hidden');
  roomInfo.classList.remove('hidden');
}

// Update player list
function updatePlayerList(players) {
  // Clear list
  playerList.innerHTML = '';
  
  // Add each player
  players.forEach(player => {
    addPlayerToList(player);
  });
}

// Add player to list
function addPlayerToList(player) {
  const playerItem = document.createElement('li');
  playerItem.setAttribute('data-player-id', player.id);
  
  // Highlight local player
  const isLocalPlayer = player.id === socketManager.getSocketId();
  if (isLocalPlayer) {
    playerItem.classList.add('local-player');
  }
  
  playerItem.textContent = `${player.username}${isLocalPlayer ? ' (You)' : ''}`;
  playerList.appendChild(playerItem);
}

// Remove player from list
function removePlayerFromList(playerId) {
  const playerItem = playerList.querySelector(`[data-player-id="${playerId}"]`);
  if (playerItem) {
    playerList.removeChild(playerItem);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);