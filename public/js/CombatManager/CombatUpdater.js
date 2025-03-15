// /public/js/CombatManager/CombatUpdater.js
import { createEntity } from '../Entities/index.js';

export class CombatUpdater {
  constructor(state) {
    this.state = state;
  }
  
  processLogEntries(newLogEntries) {
    if (!newLogEntries || newLogEntries.length === 0) return;
    
    newLogEntries.forEach(entry => this.processLogEntry(entry));
  }
  
  processLogEntry(entry) {
    // This method could trigger visual feedback based on log entries
    // It would typically call the CombatUI instance to show floating text, etc.
  }
  
  createEntities(entityDataList) {
    return entityDataList.map(entityData => {
      try {
        return createEntity({
          ...entityData,
          isLocalPlayer: entityData.id === this.state.localPlayerId
        });
      } catch (error) {
        console.error('Error creating entity, using fallback', error);
        
        // Fallback implementation
        const entity = { ...entityData, isLocalPlayer: entityData.id === this.state.localPlayerId };
        
        entity.isAlive = function() { return this.health > 0; };
        entity.getHealthPercentage = function() { return Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100)); };
        entity.getEnergyPercentage = function() { return Math.max(0, Math.min(100, (this.energy / this.maxEnergy) * 100)); };
        entity.getActionPointsPercentage = function() {
          const fullPoints = Math.floor(this.actionPoints);
          const partialPoint = this.actionPoints - fullPoints;
          return partialPoint * 100;
        };
        entity.update = function(data) {
          Object.assign(this, data);
        };
        entity.canAct = function() {
          return this.actionPoints >= 1 && this.isAlive();
        };
        entity.getEffectiveStat = function(statName) {
          let baseValue = this.stats[statName] || 0;
          let modifier = 0;
          
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
  }
  
  updateEntity(entityData) {
    const entity = this.state.entities.find(e => e.id === entityData.id);
    if (entity) {
      entity.update(entityData);
    }
  }
  
  updateCombatState(combatState) {
    if (!this.state.active) return;
    
    // Update entities
    combatState.entities.forEach(entityData => {
      this.updateEntity(entityData);
    });
    
    // Process new log entries
    const newLogEntries = combatState.log.slice(this.state.log.length);
    this.state.log = combatState.log;
    
    return newLogEntries;
  }
}