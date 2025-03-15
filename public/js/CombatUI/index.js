// /public/js/CombatUI/index.js

import { ComponentFactory } from './ComponentFactory.js';
import { EntityRenderer } from './EntityRenderer.js';
import { ActionPointManager } from './ActionPointManager.js';
import { ModalManager } from './ModalManager.js';
import { EventHandlers } from './EventHandlers.js';
import { ActionTypes, getAction, fetchAbilitiesForClass } from '../Actions/index.js';

export class CombatUI {
  constructor(combatManager) {
    this.combatManager = combatManager;

    // Cache DOM elements
    this.cacheElements();

    // Initialize helper modules
    this.initializeHelpers();

    // Setup event listeners
    this.setupEventListeners();

    // this.eventHandlers = new EventHandlers(combatManager, this.modalManager, getAction);
  }

  // Cache all frequently used DOM elements
  cacheElements() {
    this.combatScreen = document.getElementById('combat-screen');
    this.playerEntitiesContainer = document.getElementById('player-entities');
    this.enemyEntitiesContainer = document.getElementById('enemy-entities');
    this.actionPointsContainer = document.getElementById('action-points-container');
    this.attackBtn = document.getElementById('attack-btn');
    this.castBtn = document.getElementById('cast-btn');
    this.combatTimer = document.getElementById('combat-timer');

    // Modal elements
    this.selectionModal = document.getElementById('selection-modal');
    this.selectionTitle = document.getElementById('selection-title');
    this.selectionOptions = document.getElementById('selection-options');
    this.cancelSelectionBtn = document.getElementById('cancel-selection-btn');

    this.targetInfoElement = document.getElementById('current-target-info');
  }

  initializeHelpers() {
    // Create helpers in dependency order
    this.componentFactory = new ComponentFactory(this.combatManager);
    this.entityRenderer = new EntityRenderer(this.componentFactory);
    this.actionPointManager = new ActionPointManager(this.componentFactory);
    this.modalManager = new ModalManager(
      this.selectionModal,
      this.selectionTitle,
      this.selectionOptions,
      this.componentFactory
    );
    this.eventHandlers = new EventHandlers(this.combatManager, this.modalManager);
  }

  // Initialize the UI with combat data
  initializeCombat(combatState) {
    // Clear containers
    this.clearEntityContainers();

    // Render entities
    this.renderEntities(combatState.entities);

    // Update action points
    this.updateActionPoints();

    // Reset combat timer
    this.updateCombatTimer(0);

    // Show combat screen
    this.showCombatScreen();
  }

  clearEntityContainers() {
    this.playerEntitiesContainer.innerHTML = '';
    this.enemyEntitiesContainer.innerHTML = '';
  }

  // Show the combat screen
  showCombatScreen() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    this.combatScreen.classList.add('active');
  }

  updateSelectedEntity(selectedId) {
    // console.log('CombatUI.updateSelectedEntity called with:', selectedId);

    if (this.entityRenderer) {
      this.entityRenderer.updateSelectedEntity(selectedId);
    } else {
      console.error('entityRenderer is undefined');
    }

    // Update the target info text if the element exists
    const targetInfoElement = document.getElementById('current-target-info');
    if (targetInfoElement) {
      if (selectedId) {
        const target = this.combatManager.state.entities.find(e => e.id === selectedId);
        if (target) {
          targetInfoElement.textContent = `Current target: ${target.name}`;
          targetInfoElement.classList.remove('hidden');
        }
      } else {
        targetInfoElement.textContent = 'No target selected';
        targetInfoElement.classList.add('hidden');
      }
    }
  }

  // Render all entities
  renderEntities(entities) {
    this.clearEntityContainers();

    // Group entities by type
    const players = entities.filter(entity => entity.type === 'player');
    const enemies = entities.filter(entity => entity.type === 'enemy');

    // Render each group
    players.forEach(player => {
      const playerElement = this.entityRenderer.createEntityElement(player, this.combatManager);
      this.playerEntitiesContainer.appendChild(playerElement);
    });

    enemies.forEach(enemy => {
      const enemyElement = this.entityRenderer.createEntityElement(enemy, this.combatManager);
      this.enemyEntitiesContainer.appendChild(enemyElement);
    });
  }

  // Update entity UI element
  updateEntityElement(entity) {
    const entityEl = document.querySelector(`.entity-card[data-entity-id="${entity.id}"]`);
    if (!entityEl) return;
    this.entityRenderer.updateEntityElement(entity, entityEl);
  }

  // Show floating text for damage, healing, etc.
  showFloatingText(entityId, text, type = 'damage') {
    this.entityRenderer.showFloatingText(entityId, text, type);
  }

  // Update action points display for local player
  updateActionPoints() {
    const localPlayer = this.combatManager.getLocalPlayer();
    if (!localPlayer) return;

    this.actionPointManager.updateActionPoints(this.actionPointsContainer, localPlayer);
    this.updateActionButtons();
  }

  // Update action buttons based on current state
  updateActionButtons() {
    const localPlayer = this.combatManager.getLocalPlayer();
    if (!localPlayer) return;

    const canAct = localPlayer.canAct?.() || (localPlayer.actionPoints >= 1 && localPlayer.health > 0);
    const hasEnergy = localPlayer.energy >= 20;

    this.attackBtn.disabled = !canAct;
    this.castBtn.disabled = !canAct || !hasEnergy;
  }

  // Update combat timer
  updateCombatTimer(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    this.combatTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Setup event listeners
  setupEventListeners() {
    this.eventHandlers.setupAttackButtonHandler(this.attackBtn);
    this.eventHandlers.setupCastButtonHandler(this.castBtn);
    this.eventHandlers.setupCancelButtonHandler(this.cancelSelectionBtn);
  }
}