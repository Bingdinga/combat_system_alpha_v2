// Actions.js - Combat action definitions and handlers

// Action Types
const ActionTypes = {
  ATTACK: 'attack',
  DEFEND: 'defend',
  CAST: 'cast'
};

// Action class
class Action {
  constructor(type, name, description, energyCost, targetType) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.energyCost = energyCost || 0;
    this.targetType = targetType; // 'enemy', 'ally', 'self', 'all'
  }

  // Check if action is valid for the given actor
  isValid(actor) {
    // Check if actor has enough energy
    if (this.energyCost > actor.energy) {
      return false;
    }

    // Check if actor has enough action points
    if (actor.actionPoints < 1) {
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

// Attack action
class AttackAction extends Action {
  constructor() {
    super(
      ActionTypes.ATTACK,
      'Attack',
      'Deal physical damage to an enemy',
      0, // No energy cost
      'enemy'
    );
  }
}

// Defend action
class DefendAction extends Action {
  constructor() {
    super(
      ActionTypes.DEFEND,
      'Defend',
      'Increase defense for a short time',
      0, // No energy cost
      'self'
    );
  }
}

// Replace the CastSpellAction class with these specialized spell actions
class FireballAction extends Action {
  constructor() {
    super(
      ActionTypes.CAST,
      'Fireball',
      'Cast a damaging fire spell on an enemy',
      20, // Energy cost
      'enemy'
    );
    this.spellType = 'fireball';
  }

  isValid(actor) {
    return super.isValid(actor) && actor.energy >= this.energyCost;
  }
}

class IronskinAction extends Action {
  constructor() {
    super(
      ActionTypes.CAST,
      'Ironskin',
      'Cast a protective spell that increases defense by 3',
      20, // Energy cost
      'ally'
    );
    this.spellType = 'ironskin';
  }

  isValid(actor) {
    return super.isValid(actor) && actor.energy >= this.energyCost;
  }
}

class HealAction extends Action {
  constructor() {
    super(
      ActionTypes.CAST,
      'Heal',
      'Cast a healing spell that restores health',
      20, // Energy cost
      'ally'
    );
    this.spellType = 'heal';
  }

  isValid(actor) {
    return super.isValid(actor) && actor.energy >= this.energyCost;
  }
}

// Action registry
const ActionRegistry = {
  [ActionTypes.ATTACK]: new AttackAction(),
  [ActionTypes.DEFEND]: new DefendAction(),
  'fireball': new FireballAction(),
  'ironskin': new IronskinAction(),
  'heal': new HealAction()
};

// Add this after ActionRegistry
const StatusEffectRegistry = {
  'defenseBuff': {
    displayName: 'Defense',
    affectedStat: 'defense',
    cssClass: 'buff'
  },
  'ironskinBuff': {
    displayName: 'Ironskin',
    affectedStat: 'defense',
    cssClass: 'ironskin'
  },
  // Add future buffs here easily:
  'strengthBuff': {
    displayName: 'Strength',
    affectedStat: 'attack',
    cssClass: 'strength'
  },
  'hasteBufff': {
    displayName: 'Haste',
    affectedStat: 'attackSpeed',
    cssClass: 'haste'
  }
};

// Export the registry
window.StatusEffectRegistry = StatusEffectRegistry;

// Get all available actions
function getAvailableActions() {
  return Object.values(ActionRegistry);
}

// Get action by type
function getAction(actionType) {
  if (actionType === ActionTypes.CAST) {
    // Default to fireball if no spell type is specified
    return ActionRegistry['fireball'];
  }
  return ActionRegistry[actionType];
}