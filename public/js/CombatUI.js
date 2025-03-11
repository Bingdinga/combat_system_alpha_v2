// CombatUI.js - Manages the combat user interface

class CombatUI {
    constructor(combatManager) {
        this.combatManager = combatManager;

        // DOM elements
        this.combatScreen = document.getElementById('combat-screen');
        this.playerEntitiesContainer = document.getElementById('player-entities');
        this.enemyEntitiesContainer = document.getElementById('enemy-entities');
        this.combatLogContainer = document.getElementById('combat-log');
        this.actionPointsCount = document.getElementById('action-points-count');
        this.maxActionPoints = document.getElementById('max-action-points');
        this.actionPointsBar = document.getElementById('action-points-bar');
        this.attackBtn = document.getElementById('attack-btn');
        this.defendBtn = document.getElementById('defend-btn');
        this.castBtn = document.getElementById('cast-btn');
        this.combatTimer = document.getElementById('combat-timer');

        // Selection modal elements
        this.selectionModal = document.getElementById('selection-modal');
        this.selectionTitle = document.getElementById('selection-title');
        this.selectionOptions = document.getElementById('selection-options');
        this.cancelSelectionBtn = document.getElementById('cancel-selection-btn');

        // Selection callback
        this.selectionCallback = null;

        this.autoScrollToggle = document.getElementById('auto-scroll-toggle');

        // Setup event listeners
        this.setupEventListeners();
    }

    // Initialize the UI with combat data
    initializeCombat(combatState) {

        console.log('CombatUI initializing combat interface');

        // Clear containers
        this.playerEntitiesContainer.innerHTML = '';
        this.enemyEntitiesContainer.innerHTML = '';
        this.combatLogContainer.innerHTML = '';

        // Render entities
        this.renderEntities(combatState.entities);

        // Render initial combat log
        this.renderCombatLog(combatState.log);

        // Update action points
        this.updateActionPoints();

        // Reset combat timer
        this.updateCombatTimer(0);

        // Show combat screen
        this.showCombatScreen();
    }

    // Show the combat screen
    showCombatScreen() {
        console.log('Showing combat screen');
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        this.combatScreen.classList.add('active');
    }

    // Render all entities
    renderEntities(entities) {
        // Clear containers
        this.playerEntitiesContainer.innerHTML = '';
        this.enemyEntitiesContainer.innerHTML = '';

        // Sort entities by type
        const players = entities.filter(entity => entity.type === 'player');
        const enemies = entities.filter(entity => entity.type === 'enemy');

        // Create entity elements
        players.forEach(player => {
            const playerElement = this.createEntityElement(player);
            this.playerEntitiesContainer.appendChild(playerElement);
        });

        enemies.forEach(enemy => {
            const enemyElement = this.createEntityElement(enemy);
            this.enemyEntitiesContainer.appendChild(enemyElement);
        });
    }

    // Create an entity element
    createEntityElement(entity) {
        const entityEl = document.createElement('div');
        entityEl.className = `entity-card ${entity.type}`;
        entityEl.setAttribute('data-entity-id', entity.id);

        // Check if entity is alive - add a safety check
        const isAlive = typeof entity.isAlive === 'function'
            ? entity.isAlive()
            : (entity.health > 0);

        if (!isAlive) {
            entityEl.classList.add('dead');
        }

        const isLocalPlayer = this.combatManager.isLocalPlayer(entity.id);
        if (isLocalPlayer) {
            entityEl.classList.add('local-player');
        }

        // Create basic entity info
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
      <div class="entity-name">${entity.name}${isLocalPlayer ? ' (You)' : ''}</div>
      <div class="entity-health">
        <div>HP: ${entity.health}/${entity.maxHealth}</div>
        <div class="health-bar-container">
          <div class="health-bar" style="width: ${typeof entity.getHealthPercentage === 'function' ? entity.getHealthPercentage() : (entity.health / entity.maxHealth * 100)}%"></div>
        </div>
      </div>
      <div class="entity-energy">
        <div>Energy: ${entity.energy}/${entity.maxEnergy}</div>
        <div class="energy-bar-container">
          <div class="energy-bar" style="width: ${typeof entity.getEnergyPercentage === 'function' ? entity.getEnergyPercentage() : (entity.energy / entity.maxEnergy * 100)}%"></div>
        </div>
      </div>
    `;

        // Create action points display for entity
        const actionPointsDiv = document.createElement('div');
        actionPointsDiv.className = 'entity-action-points';

        // Add action points
        for (let i = 0; i < entity.maxActionPoints; i++) {
            const actionPoint = document.createElement('div');
            actionPoint.className = 'entity-action-point';

            const fill = document.createElement('div');
            fill.className = 'entity-action-point-fill';

            // Calculate fill percentage for this action point
            let fillPercentage;
            if (i < Math.floor(entity.actionPoints)) {
                // Full action point
                fillPercentage = 100;
                fill.className = 'entity-action-point-fill full';
            } else if (i === Math.floor(entity.actionPoints)) {
                // Partially filled action point
                fillPercentage = (entity.actionPoints - Math.floor(entity.actionPoints)) * 100;

                // Set class based on charge percentage
                if (fillPercentage < 50) {
                    fill.className = 'entity-action-point-fill';
                } else {
                    fill.className = 'entity-action-point-fill medium';
                }
            } else {
                // Empty action point
                fillPercentage = 0;
                fill.className = 'entity-action-point-fill';
            }

            // Set fill height
            fill.style.height = `${fillPercentage}%`;

            actionPoint.appendChild(fill);
            actionPointsDiv.appendChild(actionPoint);
        }

        // Add everything to the entity element
        entityEl.appendChild(infoDiv);
        entityEl.appendChild(actionPointsDiv);

        // Add status effects if any
        if (entity.statusEffects && entity.statusEffects.length > 0) {
            const statusEffectsEl = document.createElement('div');
            statusEffectsEl.className = 'status-effects';

            entity.statusEffects.forEach(effect => {
                const effectEl = document.createElement('span');
                effectEl.className = `status-effect ${effect.type.includes('Buff') ? 'buff' : 'debuff'}`;
                effectEl.textContent = this.formatStatusEffectName(effect.type);
                statusEffectsEl.appendChild(effectEl);
            });

            entityEl.appendChild(statusEffectsEl);
        }

        return entityEl;
    }

    // Format status effect name for display
    formatStatusEffectName(effectType) {
        // Remove "Buff" or "Debuff" suffix and capitalize
        let name = effectType.replace(/Buff|Debuff/g, '');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    // Update entity UI element
    updateEntityElement(entity) {
        const entityEl = document.querySelector(`.entity-card[data-entity-id="${entity.id}"]`);
        if (!entityEl) return;

        // Update health
        const healthBarEl = entityEl.querySelector('.health-bar');
        healthBarEl.style.width = `${entity.getHealthPercentage ? entity.getHealthPercentage() : (entity.health / entity.maxHealth * 100)}%`;
        entityEl.querySelector('.entity-health > div').textContent = `HP: ${entity.health}/${entity.maxHealth}`;

        // Update energy
        const energyBarEl = entityEl.querySelector('.energy-bar');
        energyBarEl.style.width = `${entity.getEnergyPercentage ? entity.getEnergyPercentage() : (entity.energy / entity.maxEnergy * 100)}%`;
        entityEl.querySelector('.entity-energy > div').textContent = `Energy: ${entity.energy}/${entity.maxEnergy}`;

        // Update action points
        const actionPoints = entityEl.querySelectorAll('.entity-action-point');

        actionPoints.forEach((actionPoint, index) => {
            const fill = actionPoint.querySelector('.entity-action-point-fill');

            // Calculate fill percentage for this action point
            let fillPercentage;
            if (index < Math.floor(entity.actionPoints)) {
                // Full action point
                fillPercentage = 100;
                fill.className = 'entity-action-point-fill full';
            } else if (index === Math.floor(entity.actionPoints)) {
                // Partially filled action point
                fillPercentage = (entity.actionPoints - Math.floor(entity.actionPoints)) * 100;

                // Set class based on charge percentage
                if (fillPercentage < 50) {
                    fill.className = 'entity-action-point-fill';
                } else {
                    fill.className = 'entity-action-point-fill medium';
                }
            } else {
                // Empty action point
                fillPercentage = 0;
                fill.className = 'entity-action-point-fill';
            }

            // Update the fill height
            fill.style.height = `${fillPercentage}%`;
        });

        // Update status effects
        const statusEffectsContainer = entityEl.querySelector('.status-effects');
        if (statusEffectsContainer) {
            entityEl.removeChild(statusEffectsContainer);
        }

        if (entity.statusEffects && entity.statusEffects.length > 0) {
            const statusEffectsEl = document.createElement('div');
            statusEffectsEl.className = 'status-effects';

            entity.statusEffects.forEach(effect => {
                const effectEl = document.createElement('span');
                effectEl.className = `status-effect ${effect.type.includes('Buff') ? 'buff' : 'debuff'}`;
                effectEl.textContent = this.formatStatusEffectName(effect.type);
                statusEffectsEl.appendChild(effectEl);
            });

            entityEl.appendChild(statusEffectsEl);
        }

        // Update dead status
        const isAlive = typeof entity.isAlive === 'function'
            ? entity.isAlive()
            : (entity.health > 0);
        if (!isAlive) {
            entityEl.classList.add('dead');
        } else {
            entityEl.classList.remove('dead');
        }
    }

    // In CombatUI.js, renderCombatLog method
    renderCombatLog(logEntries) {
        // Check if there are any new entries to add
        if (logEntries.length === 0) return;

        // Get the current number of log entries in the UI
        const currentEntriesCount = this.combatLogContainer.children.length;

        // Only add new entries (avoid duplicates)
        const newEntries = logEntries.slice(currentEntriesCount);
        if (newEntries.length === 0) return;

        // Get timestamp formatter
        const formatTime = (timestamp) => {
            const date = new Date(timestamp);
            return `${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        };

        // Add new log entries
        newEntries.forEach(entry => {
            const logEntryEl = document.createElement('div');
            logEntryEl.className = 'log-entry';

            // Add specific classes based on entry type
            if (entry.actorType === 'player') {
                logEntryEl.classList.add('player-action');
            } else if (entry.actorType === 'enemy') {
                logEntryEl.classList.add('enemy-action');
            }

            if (entry.type === 'defeat') {
                logEntryEl.classList.add('defeat-message');
            }

            // Format log entry text
            let logText = '';
            if (entry.actor && entry.target) {
                // Action entry
                logText = `${entry.actor} ${entry.action} ${entry.target}: ${entry.message}`;
            } else {
                // System message
                logText = entry.message;
            }

            logEntryEl.innerHTML = `
        <span class="log-time">[${formatTime(entry.time)}]</span> 
        ${logText}
      `;

            this.combatLogContainer.appendChild(logEntryEl);
        });

        // Only scroll to bottom if auto-scroll is enabled
        if (this.autoScrollToggle && this.autoScrollToggle.checked) {
            setTimeout(() => {
                this.combatLogContainer.scrollTop = this.combatLogContainer.scrollHeight;
            }, 10);
        }
    }

    // Update action points display for local player
    updateActionPoints() {
        const localPlayer = this.combatManager.getLocalPlayer();
        if (!localPlayer) return;

        // Get the container
        const container = document.getElementById('action-points-container');

        // Clear existing action points if number changed or on first run
        if (container.children.length !== localPlayer.maxActionPoints) {
            container.innerHTML = '';

            // Create action point elements
            for (let i = 0; i < localPlayer.maxActionPoints; i++) {
                const actionPoint = document.createElement('div');
                actionPoint.className = 'action-point';

                const fill = document.createElement('div');
                fill.className = 'action-point-fill';

                actionPoint.appendChild(fill);
                container.appendChild(actionPoint);
            }
        }

        // Update each action point
        const currentAP = localPlayer.actionPoints;
        const actionPoints = container.querySelectorAll('.action-point');

        actionPoints.forEach((actionPoint, index) => {
            const fill = actionPoint.querySelector('.action-point-fill');

            // Calculate fill percentage for this action point
            let fillPercentage;
            if (index < Math.floor(currentAP)) {
                // Full action point
                fillPercentage = 100;
                fill.className = 'action-point-fill full';
            } else if (index === Math.floor(currentAP)) {
                // Partially filled action point
                fillPercentage = (currentAP - Math.floor(currentAP)) * 100;

                // Set class based on charge percentage
                if (fillPercentage < 50) {
                    fill.className = 'action-point-fill';
                } else {
                    fill.className = 'action-point-fill medium';
                }
            } else {
                // Empty action point
                fillPercentage = 0;
                fill.className = 'action-point-fill';
            }

            // Update the fill height
            fill.style.height = `${fillPercentage}%`;
        });

        // Update action buttons
        this.updateActionButtons();
    }

    // Update action buttons based on current state
    updateActionButtons() {
        const localPlayer = this.combatManager.getLocalPlayer();
        if (!localPlayer) return;

        const canAct = typeof localPlayer.canAct === 'function'
            ? localPlayer.canAct()
            : (localPlayer.actionPoints >= 1 && localPlayer.health > 0);
        const hasEnergy = localPlayer.energy >= 20; // Energy required for cast spell

        // Attack button
        this.attackBtn.disabled = !canAct;

        // Defend button
        this.defendBtn.disabled = !canAct;

        // Cast spell button
        this.castBtn.disabled = !canAct || !hasEnergy;
    }

    // Update combat timer
    updateCombatTimer(duration) {
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        this.combatTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Show target selection modal
    showSelectionModal(title, options, callback) {
        // Set title
        this.selectionTitle.textContent = title;

        // Clear options
        this.selectionOptions.innerHTML = '';

        // Add options
        options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'selection-option';
            optionEl.setAttribute('data-option-id', option.id);
            optionEl.textContent = option.name;

            // Add click handler
            optionEl.addEventListener('click', () => {
                this.hideSelectionModal();
                if (callback) callback(option);
            });

            this.selectionOptions.appendChild(optionEl);
        });

        // Store callback
        this.selectionCallback = callback;

        // Show modal
        this.selectionModal.classList.add('active');
    }

    // Hide target selection modal
    hideSelectionModal() {
        this.selectionModal.classList.remove('active');
        this.selectionCallback = null;
    }

    // Select target for an action
    selectTarget(actionType, entities, callback) {
        const action = getAction(actionType);
        if (!action) return;

        // Get valid targets based on action type
        const localPlayer = this.combatManager.getLocalPlayer();
        const validTargets = action.getValidTargets(localPlayer, entities);

        // If only one valid target (self), automatically select it
        if (validTargets.length === 1 && action.targetType === 'self') {
            callback(validTargets[0]);
            return;
        }

        // Otherwise show selection modal
        this.showSelectionModal(
            `Select ${action.targetType} to ${action.name.toLowerCase()}`,
            validTargets.map(entity => ({ id: entity.id, name: entity.name })),
            target => callback({ id: target.id })
        );
    }

    // Setup event listeners
    setupEventListeners() {
        // Action buttons
        this.attackBtn.addEventListener('click', () => {
            if (this.attackBtn.disabled) return;

            const entities = this.combatManager.getEntities();
            this.selectTarget(ActionTypes.ATTACK, entities, target => {
                this.combatManager.performAction(ActionTypes.ATTACK, target.id);
            });
        });

        this.defendBtn.addEventListener('click', () => {
            if (this.defendBtn.disabled) return;

            const localPlayer = this.combatManager.getLocalPlayer();
            this.combatManager.performAction(ActionTypes.DEFEND, localPlayer.id);
        });

        this.castBtn.addEventListener('click', () => {
            if (this.castBtn.disabled) return;

            const entities = this.combatManager.getEntities();
            this.selectTarget(ActionTypes.CAST, entities, target => {
                this.combatManager.performAction(ActionTypes.CAST, target.id);
            });
        });

        // Cancel selection button
        this.cancelSelectionBtn.addEventListener('click', () => {
            this.hideSelectionModal();
        });
    }
}