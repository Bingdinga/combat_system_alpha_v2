// public/js/Actions.js

// Action types
const ActionTypes = {
  ATTACK: 'attack',
  CAST: 'cast',
  PASSIVE: 'passive'
};

// Action class
class Action {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.energyCost = data.energyCost || 0;
    this.targetType = data.targetType; // 'enemy', 'ally', 'self', 'all'
    this.type = data.type || ActionTypes.ATTACK;
  }

  // Check if action is valid for the given actor
  isValid(actor) {
    // Check if actor has enough energy
    if (this.energyCost > actor.energy) {
      return false;
    }

    // Check if actor has enough action points for non-passive abilities
    if (actor.actionPoints < 1 && this.type !== ActionTypes.PASSIVE) {
      return false;
    }

    // Class-specific checks
    if (this.id === 'secondWind' && actor.characterClass !== 'FIGHTER') {
      return false;
    }
    
    if ((this.id === 'sneakAttack' || this.id === 'evasion') && actor.characterClass !== 'ROGUE') {
      return false;
    }

    return true;
  }

  // Get valid targets for this action
  getValidTargets(actor, allEntities) {
    const validTargets = [];

    // Filter entities based on target type
    switch (this.targetType) {
      case 'enemy':
        // Only living enemies
        validTargets.push(...allEntities.filter(entity =>
          entity.type !== actor.type && entity.isAlive()
        ));
        break;

      case 'ally':
        // Only living allies (including self)
        validTargets.push(...allEntities.filter(entity =>
          entity.type === actor.type && entity.isAlive()
        ));
        break;

      case 'self':
        // Only self
        validTargets.push(actor);
        break;

      case 'all':
        // All living entities
        validTargets.push(...allEntities.filter(entity => entity.isAlive()));
        break;
    }

    return validTargets;
  }
}

// Actions registry - populated from server
let ActionRegistry = {};

// Status effect registry
const StatusEffectRegistry = {
  'acBuff': {
    displayName: 'Shield',
    affectedStat: 'ac',
    cssClass: 'buff'
  },
  'strengthBuff': {
    displayName: 'Strength',
    affectedStat: 'attack',
    cssClass: 'strength'
  }
};

// Export the registry
window.StatusEffectRegistry = StatusEffectRegistry;

// Fetch abilities from the server
async function fetchAbilities() {
  try {
    const response = await fetch('/api/abilities');
    const abilities = await response.json();
    
    // Create Action objects from the data
    abilities.forEach(ability => {
      ActionRegistry[ability.id] = new Action(ability);
    });
    
    console.log('Abilities loaded from server:', ActionRegistry);
  } catch (error) {
    console.error('Error fetching abilities:', error);
    
    // Set up some default actions as fallback
    ActionRegistry = {
      'attack': new Action({
        id: 'attack',
        name: 'Attack',
        description: 'Deal physical damage to an enemy',
        energyCost: 0,
        targetType: 'enemy',
        type: 'attack'
      }),
      'fireball': new Action({
        id: 'fireball',
        name: 'Fireball',
        description: 'Cast a damaging fire spell on an enemy',
        energyCost: 20,
        targetType: 'enemy',
        type: 'cast'
      })
    };
  }
}

// Load abilities when the script loads
fetchAbilities();

// Get all available actions
function getAvailableActions() {
  return Object.values(ActionRegistry);
}

// Fetch abilities for a specific class
async function fetchAbilitiesForClass(className) {
  try {
    const response = await fetch(`/api/abilities/${className}`);
    const abilities = await response.json();
    return abilities.map(ability => new Action(ability));
  } catch (error) {
    console.error(`Error fetching abilities for ${className}:`, error);
    return [ActionRegistry['attack']]; // Fallback to basic attack
  }
}

// Get action by ID
function getAction(actionId) {
  return ActionRegistry[actionId];
}

// Make these functions available globally
window.getAvailableActions = getAvailableActions;
window.getAction = getAction;
window.fetchAbilitiesForClass = fetchAbilitiesForClass;