// /public/js/Actions/Action.js

export class Action {
    constructor(data) {
      this.id = data.id;
      this.name = data.name;
      this.description = data.description;
      this.energyCost = data.energyCost || 0;
      this.targetType = data.targetType; // 'enemy', 'ally', 'self', 'all'
      this.type = data.type || 'attack';
    }
  
    isValid(actor) {
      if (!this.hasEnoughResources(actor)) return false;
      if (!this.isValidForClass(actor)) return false;
      return true;
    }
    
    hasEnoughResources(actor) {
      if (this.energyCost > actor.energy) return false;
      if (actor.actionPoints < 1 && this.type !== 'passive') return false;
      return true;
    }
    
    isValidForClass(actor) {
      const classRequirements = {
        'secondWind': 'FIGHTER',
        'sneakAttack': 'ROGUE',
        'evasion': 'ROGUE'
      };
      
      const requiredClass = classRequirements[this.id];
      if (requiredClass && actor.characterClass !== requiredClass) return false;
      
      return true;
    }
  
    getValidTargets(actor, allEntities) {
      const validTargets = [];
  
      switch (this.targetType) {
        case 'enemy':
          validTargets.push(...allEntities.filter(entity =>
            entity.type !== actor.type && entity.isAlive()
          ));
          break;
  
        case 'ally':
          validTargets.push(...allEntities.filter(entity =>
            entity.type === actor.type && entity.isAlive()
          ));
          break;
  
        case 'self':
          validTargets.push(actor);
          break;
  
        case 'all':
          validTargets.push(...allEntities.filter(entity => entity.isAlive()));
          break;
      }
  
      return validTargets;
    }
  }