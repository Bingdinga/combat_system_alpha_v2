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

const characterCreationScreen = document.getElementById('character-creation');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const createCharacterBtn = document.getElementById('create-character-btn');
const classOptions = document.querySelectorAll('.class-option');
let selectedClass = null;

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

    console.log('Application initialized. Socket connected:', socketManager.isConnected());
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
        console.log('Start combat button clicked');  // Add this debug line
        socketManager.startCombat();
    });

    // Leave room button
    leaveRoomBtn.addEventListener('click', () => {
        socketManager.leaveRoom();
        showLoginForm();
    });

    backToLoginBtn.addEventListener('click', () => {
        showLoginForm();
    });

    // Class selection
    classOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            classOptions.forEach(opt => opt.classList.remove('selected'));

            // Add selected class to clicked option
            option.classList.add('selected');

            // Store selected class
            selectedClass = option.getAttribute('data-class');

            // Update character preview
            updateCharacterPreview(selectedClass);

            // Enable create button
            createCharacterBtn.disabled = false;
        });
    });

    // Create character button
    createCharacterBtn.addEventListener('click', () => {
        if (!selectedClass) return;

        const username = usernameInput.value.trim();
        const roomId = roomIdInput.value.trim();

        if (!username || !roomId) {
            alert('Please enter a username and room ID');
            return;
        }

        // Join room with character class
        socketManager.joinRoom(username, roomId, selectedClass);
    });

    // Modify the Join Room button to show character creation instead
    joinBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const roomId = roomIdInput.value.trim();

        if (!username || !roomId) {
            alert('Please enter a username and room ID');
            return;
        }

        // Show character creation instead of joining immediately
        showCharacterCreation();
    });
}

function showCharacterCreation() {
    loginForm.classList.add('hidden');
    characterCreationScreen.classList.remove('hidden');
    roomInfo.classList.add('hidden');

    // Reset selection
    classOptions.forEach(opt => opt.classList.remove('selected'));
    selectedClass = null;
    createCharacterBtn.disabled = true;

    // Reset preview
    updateCharacterPreview(null);
}

function updateCharacterPreview(className) {
    const abilityScoresPreview = document.getElementById('ability-scores-preview');
    const previewAC = document.getElementById('preview-ac');
    const previewHP = document.getElementById('preview-hp');

    if (!className) {
        // Default values
        const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        abilities.forEach(ability => {
            const abilityElement = abilityScoresPreview.querySelector(`.ability-score:nth-child(${abilities.indexOf(ability) + 1})`);
            const valueElement = abilityElement.querySelector('.ability-value');
            const modElement = abilityElement.querySelector('.ability-mod');

            valueElement.textContent = '10';
            modElement.textContent = '(+0)';
        });

        previewAC.textContent = '10';
        previewHP.textContent = '50'; // Default HP
        return;
    }

    // Get class template
    const classTemplate = CharacterClasses[className];
    if (!classTemplate) return;

    // Update ability scores
    for (const [ability, value] of Object.entries(classTemplate.baseAbilityScores)) {
        const abilityShort = ability.substring(0, 3).toUpperCase();
        const abilityIndex = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].indexOf(abilityShort);

        if (abilityIndex !== -1) {
            const abilityElement = abilityScoresPreview.querySelector(`.ability-score:nth-child(${abilityIndex + 1})`);
            const valueElement = abilityElement.querySelector('.ability-value');
            const modElement = abilityElement.querySelector('.ability-mod');

            const modifier = Math.floor((value - 10) / 2);
            valueElement.textContent = value;
            modElement.textContent = `(${modifier >= 0 ? '+' : ''}${modifier})`;
        }
    }

    // Update AC and HP
    previewAC.textContent = classTemplate.baseAC;

    // Update to use the new health values
    let baseHP = 50; // Default
    if (className === 'FIGHTER') baseHP = 70;
    else if (className === 'WIZARD') baseHP = 40;
    else if (className === 'ROGUE') baseHP = 50;

    // Add constitution modifier to base HP
    const conModifier = Math.floor((classTemplate.baseAbilityScores.constitution - 10) / 2);
    const hp = baseHP + conModifier;

    previewHP.textContent = hp;
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
    characterCreationScreen.classList.add('hidden');
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

    // Create player info with class if available
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = `${player.username}${isLocalPlayer ? ' (You)' : ''}`;

    playerItem.appendChild(nameSpan);

    if (player.characterClass) {
        const classSpan = document.createElement('span');
        classSpan.className = 'player-class';
        classSpan.textContent = player.characterClass.charAt(0) + player.characterClass.slice(1).toLowerCase();
        playerItem.appendChild(classSpan);
    }

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