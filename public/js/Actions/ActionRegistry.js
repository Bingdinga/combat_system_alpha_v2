// /public/js/Actions/ActionRegistry.js
import { Action } from './Action.js';

// Actions registry - populated from server
let ActionRegistry = {};

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

export {
  ActionRegistry,
  fetchAbilities,
  getAvailableActions,
  fetchAbilitiesForClass,
  getAction
};