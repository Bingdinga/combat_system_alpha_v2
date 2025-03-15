// /public/js/main.js
import { CombatManager } from './CombatManager/index.js';
import { socketManager } from './Network/index.js';
import { fetchCharacterClasses, CharacterClasses } from './Entities/index.js';
import { fetchAbilitiesForClass, ActionTypes } from './Actions/index.js';

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
  // Create combat manager with explicit dependencies
  combatManager = new CombatManager(socketManager);

  // Setup UI event listeners
  setupEventListeners();
  
  // Setup Socket.io event listeners - make sure this line is here!
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

    // Show character creation instead of joining immediately
    showCharacterCreation();
  });

  // Start combat button
  startCombatBtn.addEventListener('click', () => {
    console.log('Start combat button clicked');
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
}

function showCharacterCreation() {
  loginForm.classList.add('hidden');
  characterCreationScreen.classList.remove('hidden');
  roomInfo.classList.add('hidden');

  // Generate class options dynamically
  generateClassOptions();

  // Reset selection
  selectedClass = null;
  createCharacterBtn.disabled = true;

  // Reset preview
  updateCharacterPreview(null);
}

async function updateCharacterPreview(className) {
  const abilityScoresPreview = document.getElementById('ability-scores-preview');
  const previewAC = document.getElementById('preview-ac');
  const previewHP = document.getElementById('preview-hp');
  const previewAbilities = document.getElementById('preview-abilities');

  // Clear abilities list
  if (previewAbilities) {
    previewAbilities.innerHTML = '';
  }

  if (!className) {
    // Default values
    const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS'];
    abilities.forEach(ability => {
      const abilityElement = abilityScoresPreview.querySelector(
        `.ability-score:nth-child(${abilities.indexOf(ability) + 1})`);
      const valueElement = abilityElement.querySelector('.ability-value');

      // Clear any existing classes
      valueElement.className = 'ability-value';

      // Set value to 0
      valueElement.textContent = '0';
    });

    previewAC.textContent = '10';
    previewHP.textContent = '50'; // Default HP
    return;
  }

  // Get class template
  const classTemplate = CharacterClasses[className] || await fetchClass(className);

  if (!classTemplate) return;

  // Update ability scores
  for (const [ability, value] of Object.entries(classTemplate.baseAbilityScores)) {
    const abilityShort = ability.substring(0, 3).toUpperCase();
    const abilityIndex = ['STR', 'DEX', 'CON', 'INT', 'WIS'].indexOf(abilityShort);

    if (abilityIndex !== -1) {
      const abilityElement = abilityScoresPreview.querySelector(
        `.ability-score:nth-child(${abilityIndex + 1})`);
      const valueElement = abilityElement.querySelector('.ability-value');

      // Clear any existing classes
      valueElement.className = 'ability-value';

      // Set the formatted text with proper color
      if (value > 0) {
        valueElement.classList.add('ability-positive');
        valueElement.textContent = '+' + value;
      } else if (value < 0) {
        valueElement.classList.add('ability-negative');
        valueElement.textContent = value; // Already has minus sign
      } else {
        valueElement.textContent = '0';
      }
    }
  }

  // Update AC and HP
  previewAC.textContent = classTemplate.baseAC;

  // Update base HP
  let baseHP = 50; // Default
  if (className === 'FIGHTER') baseHP = 70;
  else if (className === 'WIZARD') baseHP = 40;
  else if (className === 'ROGUE') baseHP = 50;

  // Add constitution directly to base HP
  const constitution = classTemplate.baseAbilityScores.constitution;
  const hp = baseHP + constitution;

  previewHP.textContent = hp;

  // Update abilities list if the element exists
  if (previewAbilities && classTemplate.abilities) {
    // Try to fetch detailed ability information
    try {
      const abilities = await fetchAbilitiesForClass(className);

      abilities.forEach(ability => {
        const abilityItem = document.createElement('li');

        // Create name with energy cost (if any)
        const nameSpan = document.createElement('span');
        nameSpan.className = 'ability-name';
        nameSpan.textContent = ability.name;

        if (ability.energyCost > 0) {
          nameSpan.textContent += ` (${ability.energyCost} energy)`;
        }

        abilityItem.appendChild(nameSpan);

        // Add description if available
        if (ability.description) {
          const descSpan = document.createElement('div');
          descSpan.className = 'ability-description';
          descSpan.textContent = ability.description;
          abilityItem.appendChild(descSpan);
        }

        previewAbilities.appendChild(abilityItem);
      });
    } catch (error) {
      // Fallback to just ability names if detailed info fails
      console.error('Error fetching detailed ability info:', error);

      classTemplate.abilities.forEach(abilityId => {
        const abilityItem = document.createElement('li');
        abilityItem.textContent = abilityId;
        previewAbilities.appendChild(abilityItem);
      });
    }
  }
}

async function fetchClass(className) {
  try {
    const response = await fetch('/api/classes');
    const classes = await response.json();
    CharacterClasses = classes; // Store for future use
    return classes[className];
  } catch (error) {
    console.error(`Error fetching class ${className}:`, error);
    return null;
  }
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

    console.log('Start combat button in DOM:', document.getElementById('start-combat-btn'));
    console.log('Room info container:', document.getElementById('room-info'));
    console.log('Room info display style:', document.getElementById('room-info').style.display);
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
  characterCreationScreen.classList.add('hidden');
  roomInfo.classList.remove('hidden');

  // Make sure the start combat button is visible
  startCombatBtn.style.display = 'block';

  console.log('Room info displayed, combat button should be visible');
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

// Generate class options dynamically
function generateClassOptions() {
  const container = document.getElementById('dynamic-class-options');
  container.innerHTML = '';

  for (const [className, classData] of Object.entries(CharacterClasses)) {
    const classOption = document.createElement('div');
    classOption.className = 'class-option';
    classOption.setAttribute('data-class', className);

    const nameHeader = document.createElement('h4');
    nameHeader.textContent = classData.name;

    const statList = document.createElement('ul');
    statList.className = 'stat-preview';

    // Add key stats
    for (const [stat, value] of Object.entries(classData.baseAbilityScores)) {
      if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom'].includes(stat)) {
        const statItem = document.createElement('li');
        const statName = stat.substring(0, 3).toUpperCase();

        // Create the stat name element
        const statNameElement = document.createElement('span');
        statNameElement.textContent = statName + ' ';

        // Create the value element with color
        const statValueElement = document.createElement('span');
        statValueElement.className = 'stat-value';

        if (value > 0) {
          statValueElement.classList.add('ability-positive');
          statValueElement.textContent = '+' + value;
        } else if (value < 0) {
          statValueElement.classList.add('ability-negative');
          statValueElement.textContent = value; // Already has minus sign
        } else {
          statValueElement.textContent = '0';
        }

        statItem.appendChild(statNameElement);
        statItem.appendChild(statValueElement);
        statList.appendChild(statItem);
      }
    }

    // Add AC
    const acItem = document.createElement('li');
    acItem.textContent = `AC: ${classData.baseAC}`;
    statList.appendChild(acItem);

    // Append elements
    classOption.appendChild(nameHeader);
    classOption.appendChild(statList);

    // Add click event
    classOption.addEventListener('click', () => {
      document.querySelectorAll('.class-option').forEach(opt =>
        opt.classList.remove('selected'));
      classOption.classList.add('selected');
      selectedClass = className;
      updateCharacterPreview(className);
      document.getElementById('create-character-btn').disabled = false;
    });

    container.appendChild(classOption);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);