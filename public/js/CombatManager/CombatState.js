// /public/js/CombatManager/CombatState.js

export class CombatState {
    constructor() {
      this.active = false;
      this.combatId = null;
      this.roomId = null;
      this.entities = [];
      this.localPlayerId = null;
      this.startTime = null;
      this.log = [];
      this.actionCooldown = false;
    }
    
    initialize(combatState, localPlayerId) {
      this.active = true;
      this.combatId = combatState.id;
      this.roomId = combatState.roomId;
      this.startTime = combatState.startTime;
      this.localPlayerId = localPlayerId;
      this.log = combatState.log;
      this.entities = [];
    }
    
    reset() {
      this.active = false;
      this.combatId = null;
      this.entities = [];
      this.log = [];
      this.startTime = null;
      this.result = null;
    }
    
    getLocalPlayer() {
      return this.entities.find(entity => entity.id === this.localPlayerId);
    }
    
    isLocalPlayer(entityId) {
      return entityId === this.localPlayerId;
    }
    
    getEntities() {
      return this.entities;
    }
    
    getCombatDuration() {
      if (!this.startTime) return 0;
      return Date.now() - this.startTime;
    }
    
    setActionCooldown(value = true, timeout = 300) {
      this.actionCooldown = value;
      
      if (value) {
        setTimeout(() => {
          this.actionCooldown = false;
        }, timeout);
      }
    }
  }