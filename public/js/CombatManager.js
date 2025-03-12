// CombatManager.js - Client-side combat state management

class CombatManager {
    constructor() {
        this.socketManager = socketManager; // Global socket manager instance

        if (!this.socketManager) {
            console.error('socketManager is not defined. Combat functionality will not work.');
        }

        this.combatUI = null;

        // Combat state
        this.active = false;
        this.combatId = null;
        this.roomId = null;
        this.entities = [];
        this.localPlayerId = null;
        this.startTime = null;
        this.log = [];

        // Add action cooldown tracking
        this.actionCooldown = false;

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
            console.log('Combat initiated event received! (public/js/CombatManager)', combatState);
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
        console.log('(public/js/CombatManager) Initializing combat with state:', combatState);

        // Set combat active
        this.active = true;

        // Store combat data
        this.combatId = combatState.id;
        this.roomId = combatState.roomId;
        this.startTime = combatState.startTime;

        // Set local player ID
        this.localPlayerId = this.socketManager.getSocketId();

        // Create entity objects with fallback if createEntity is not working
        this.entities = combatState.entities.map(entityData => {
            try {
                // Try to use the normal createEntity function
                return createEntity({
                    ...entityData,
                    isLocalPlayer: entityData.id === this.localPlayerId
                });
            } catch (e) {
                console.error('Error creating entity with createEntity, using fallback', e);

                // Fallback implementation
                const entity = { ...entityData, isLocalPlayer: entityData.id === this.localPlayerId };

                // Add missing methods
                entity.isAlive = function () { return this.health > 0; };
                entity.getHealthPercentage = function () { return Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100)); };
                entity.getEnergyPercentage = function () { return Math.max(0, Math.min(100, (this.energy / this.maxEnergy) * 100)); };
                entity.getActionPointsPercentage = function () {
                    const fullPoints = Math.floor(this.actionPoints);
                    const partialPoint = this.actionPoints - fullPoints;
                    return partialPoint * 100;
                };
                entity.update = function (data) {
                    Object.assign(this, data);
                };
                entity.canAct = function () {
                    return this.actionPoints >= 1 && this.isAlive();
                };
                entity.getEffectiveStat = function (statName) {
                    let baseValue = this.stats[statName] || 0;
                    let modifier = 0;

                    // Apply relevant status effects
                    for (const effect of this.statusEffects || []) {
                        if (effect.type === `${statName}Buff`) {
                            modifier += effect.value;
                        } else if (effect.type === `${statName}Debuff`) {
                            modifier -= effect.value;
                        }
                    }

                    return Math.max(0, baseValue + modifier);
                };

                return entity;
            }
        });

        // Store combat log
        this.log = combatState.log;

        // Initialize UI
        this.combatUI.initializeCombat(combatState);
    }

    // Update combat state from server
    // In CombatManager.js, replace or modify the updateCombatState method
    updateCombatState(combatState) {
        if (!this.active) return;

        // Update entities with server's authoritative values
        combatState.entities.forEach(entityData => {
            const entity = this.entities.find(e => e.id === entityData.id);
            if (entity) {
                // Store previous values before update
                const prevHealth = entity.health;
                const prevActionPoints = entity.actionPoints;

                // Update the entity with server data
                entity.update(entityData);

                // Update UI
                this.combatUI.updateEntityElement(entity);
            }
        });

        // Process new log entries for floating text
        const newLogEntries = combatState.log.slice(this.log.length);
        this.log = combatState.log;

        newLogEntries.forEach(entry => {
            // In CombatManager.js, replace that section with:
            // Handle attack damage
            if (entry.action === 'attack' && entry.details && entry.details.damage) {
                this.combatUI.showFloatingText(
                    entry.targetId,
                    `-${entry.details.damage}`,
                    'damage'
                );
            }

            // Handle fireball spell damage
            if (entry.action === 'cast' && entry.details && entry.details.spellType === 'fireball' && entry.details.spellDamage) {
                this.combatUI.showFloatingText(
                    entry.targetId,
                    `-${entry.details.spellDamage}`,
                    'damage'
                );
            }

            // Handle healing
            if (entry.action === 'cast' && entry.details && entry.details.spellType === 'heal' && entry.details.healAmount) {
                this.combatUI.showFloatingText(
                    entry.targetId,
                    `+${entry.details.healAmount}`,
                    'heal'
                );
            }

            // Handle Ironskin
            if (entry.action === 'cast' && entry.details && entry.details.spellType === 'ironskin') {
                this.combatUI.showFloatingText(
                    entry.targetId,
                    `+DEF ${entry.details.buffValue}`,
                    'buff'
                );
            }

            // Handle defeat messages
            if (entry.type === 'defeat') {
                this.combatUI.showFloatingText(
                    entry.entityId,
                    'Defeated!',
                    'damage'
                );
            }

            // Handle defense buff
            if (entry.action === 'defend' && entry.details && entry.details.buffValue) {
                this.combatUI.showFloatingText(
                    entry.actorId,
                    `+DEF ${entry.details.buffValue}`,
                    'buff'
                );
            }
        });

        // Update action points UI with server's values
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

        // Add a brief delay before showing the result screen
        // This allows the final state update to be rendered
        setTimeout(() => {
            // Show results screen
            this.showResultScreen();
        }, 300);
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

        // Use a more reliable way to check if entities are alive
        const survivingPlayers = playerEntities.filter(e => {
            const isAlive = typeof e.isAlive === 'function'
                ? e.isAlive()
                : (e.health > 0);
            return isAlive;
        }).length;

        const totalPlayers = playerEntities.length;

        const defeatedEnemies = enemyEntities.filter(e => {
            const isAlive = typeof e.isAlive === 'function'
                ? e.isAlive()
                : (e.health > 0);
            return !isAlive;
        }).length;

        const totalEnemies = enemyEntities.length;

        combatStats.innerHTML = `
            <p>Combat Duration: ${minutes}m ${seconds}s</p>
            <p>Surviving Players: ${survivingPlayers}/${totalPlayers}</p>
            <p>Enemies Defeated: ${defeatedEnemies}/${totalEnemies}</p>
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
    // In CombatManager.js, modify the performAction method to be more robust
    performAction(actionType, targetId) {
        if (!this.active) return;

        // Get local player
        const localPlayer = this.getLocalPlayer();
        if (!localPlayer) return;

        // console.log("Action points before action:", localPlayer.actionPoints);

        // Only allow actions with a full action point available
        if (localPlayer.actionPoints < 1) {
            console.log("Not enough action points:", localPlayer.actionPoints);
            return;
        }

        // Check if action is on cooldown - stricter cooldown to prevent spam
        if (this.actionCooldown) {
            console.log("Action is on cooldown - preventing rapid clicks");
            return;
        }

        // Set a stricter cooldown - 300ms should be enough to ensure server responses arrive
        this.actionCooldown = true;
        setTimeout(() => {
            this.actionCooldown = false;
        }, 300);

        // Skip client-side adjustment of action points
        // Let the server be authoritative and handle point consumption

        // Send action to server
        this.socketManager.performAction({
            type: actionType.startsWith('cast:') ? 'cast' : actionType,
            spellType: actionType.startsWith('cast:') ? actionType.split(':')[1] : undefined,
            targetId: targetId
        });

        // Apply a temporary optimistic update for better UI feedback
        // But note this will be overridden by the next server update
        const originalPoints = localPlayer.actionPoints;
        localPlayer.actionPoints = Math.max(0, Math.floor(localPlayer.actionPoints) - 1 + (localPlayer.actionPoints % 1));
        console.log(`Action points temporarily adjusted: ${originalPoints} → ${localPlayer.actionPoints}`);

        // Update UI
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

            // Only update the combat timer
            const duration = this.getCombatDuration();
            this.combatUI.updateCombatTimer(duration);

            // DO NOT update action points client-side
            // Remove the client-side action point calculation completely
            // Let the server be the single source of truth
        }, 100);
    }
}