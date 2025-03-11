// CombatManager.js - Client-side combat state management

class CombatManager {
    constructor() {
      this.socketManager = socketManager; // Global socket manager instance
      this.combatUI = null;
      
      // Combat state
      this.active = false;
      this.combatId = null;
      this.roomId = null;
      this.entities = [];
      this.localPlayerId = null;
      this.startTime = null;
      this.log = [];
      
      // Initialize UI
      this.initializeUI();
      
      // Setup socket event listeners
      this.setupSocketListeners();
      
      // Start update loop
      this.startUpdateLoop();
    }
    
    // Initialize UI
    initializeUI() {
      this.combatUI = new CombatUI(this);
    }
    
    // Setup socket listeners
    setupSocketListeners() {
      // Combat initiated event
      this.socketManager.on('combatInitiated', (combatState) => {
        this.initializeCombat(combatState);
      });
      
      // Combat updated event
      this.socketManager.on('combatUpdated', (combatState) => {
        this.updateCombatState(combatState);
      });
      
      // Combat ended event
      this.socketManager.on('combatEnded', (data) => {
        this.endCombat(data);
      });
    }
    
    // Initialize combat with server state
    initializeCombat(combatState) {
      // Set combat active
      this.active = true;
      
      // Store combat data
      this.combatId = combatState.id;
      this.roomId = combatState.roomId;
      this.startTime = combatState.startTime;
      
      // Set local player ID
      this.localPlayerId = this.socketManager.getSocketId();
      
      // Create entity objects
      this.entities = combatState.entities.map(entityData => {
        return createEntity({
          ...entityData,
          isLocalPlayer: entityData.id === this.localPlayerId
        });
      });
      
      // Store combat log
      this.log = combatState.log;
      
      // Initialize UI
      this.combatUI.initializeCombat(combatState);
    }
    
    // Update combat state from server
    updateCombatState(combatState) {
      if (!this.active) return;
      
      // Update log with new entries
      const newLogEntries = combatState.log.slice(this.log.length);
      this.log = combatState.log;
      
      // Update entities
      combatState.entities.forEach(entityData => {
        const entity = this.entities.find(e => e.id === entityData.id);
        if (entity) {
          entity.update(entityData);
        }
      });
      
      // Update UI
      combatState.entities.forEach(entityData => {
        const entity = this.entities.find(e => e.id === entityData.id);
        if (entity) {
          this.combatUI.updateEntityElement(entity);
        }
      });
      
      // Update combat log if new entries
      if (newLogEntries.length > 0) {
        this.combatUI.renderCombatLog(newLogEntries);
      }
      
      // Update action points UI
      this.combatUI.updateActionPoints();
    }
    
    // End combat
    endCombat(data) {
      // Set combat inactive
      this.active = false;
      
      // Store result
      this.result = data.result;
      
      // Update final state
      this.updateCombatState(data.combat);
      
      // Show results screen
      this.showResultScreen();
    }
    
    // Show results screen
    showResultScreen() {
      // Get result screen elements
      const resultScreen = document.getElementById('result-screen');
      const resultTitle = document.getElementById('result-title');
      const resultMessage = document.getElementById('result-message');
      const combatStats = document.getElementById('combat-stats');
      const returnBtn = document.getElementById('return-btn');
      
      // Set result title
      resultTitle.textContent = this.result === 'victory' ? 'Victory!' : 'Defeat';
      
      // Set result message
      resultMessage.textContent = this.result === 'victory' 
        ? 'Congratulations! All enemies have been defeated.'
        : 'Your party has been defeated. Better luck next time!';
      
      // Calculate and display stats
      const combatDuration = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(combatDuration / 60);
      const seconds = combatDuration % 60;
      
      const playerEntities = this.entities.filter(e => e.type === 'player');
      const enemyEntities = this.entities.filter(e => e.type === 'enemy');
      
      const survivingPlayers = playerEntities.filter(e => e.isAlive()).length;
      const totalPlayers = playerEntities.length;
      
      combatStats.innerHTML = `
        <p>Combat Duration: ${minutes}m ${seconds}s</p>
        <p>Surviving Players: ${survivingPlayers}/${totalPlayers}</p>
        <p>Enemies Defeated: ${enemyEntities.length - enemyEntities.filter(e => e.isAlive()).length}/${enemyEntities.length}</p>
      `;
      
      // Setup return button
      returnBtn.onclick = () => {
        // Hide result screen
        resultScreen.classList.remove('active');
        
        // Show room screen
        document.getElementById('room-screen').classList.add('active');
        
        // Reset combat data
        this.reset();
      };
      
      // Show result screen
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
      });
      resultScreen.classList.add('active');
    }
    
    // Reset combat state
    reset() {
      this.active = false;
      this.combatId = null;
      this.entities = [];
      this.log = [];
      this.startTime = null;
      this.result = null;
    }
    
    // Perform an action
    performAction(actionType, targetId) {
      if (!this.active) return;
      
      // Get local player
      const localPlayer = this.getLocalPlayer();
      if (!localPlayer || !localPlayer.canAct()) return;
      
      // Check if action is valid
      const action = getAction(actionType);
      if (!action || !action.isValid(localPlayer)) return;
      
      // Validate target
      const target = this.entities.find(e => e.id === targetId);
      if (!target) return;
      
      // Check if target is valid for this action
      const validTargets = action.getValidTargets(localPlayer, this.entities);
      if (!validTargets.some(e => e.id === targetId)) return;
      
      // Send action to server
      this.socketManager.performAction({
        type: actionType,
        targetId: targetId
      });
      
      // Update UI immediately (optimistic update)
      this.combatUI.updateActionPoints();
    }
    
    // Get local player entity
    getLocalPlayer() {
      return this.entities.find(entity => entity.id === this.localPlayerId);
    }
    
    // Check if an entity is the local player
    isLocalPlayer(entityId) {
      return entityId === this.localPlayerId;
    }
    
    // Get all entities
    getEntities() {
      return this.entities;
    }
    
    // Get combat duration
    getCombatDuration() {
      if (!this.startTime) return 0;
      return Date.now() - this.startTime;
    }
    
    // Update loop for client-side predictions
    startUpdateLoop() {
      setInterval(() => {
        if (!this.active) return;
        
        // Update action points for local player
        const localPlayer = this.getLocalPlayer();
        if (localPlayer) {
          // Calculate action points recharge
          const now = Date.now();
          const timeSinceLastAction = now - localPlayer.lastActionTime;
          const newActionPoints = localPlayer.actionPoints + (timeSinceLastAction / localPlayer.actionRechargeRate);
          
          // Update action points if changed
          if (Math.floor(newActionPoints) !== Math.floor(localPlayer.actionPoints)) {
            localPlayer.actionPoints = Math.min(localPlayer.maxActionPoints, newActionPoints);
            localPlayer.lastActionTime = now;
            
            // Update UI
            this.combatUI.updateActionPoints();
            this.combatUI.updateEntityElement(localPlayer);
          }
        }
        
        // Update combat timer
        const duration = this.getCombatDuration();
        this.combatUI.updateCombatTimer(duration);
      }, 100); // Update every 100ms
    }
  }