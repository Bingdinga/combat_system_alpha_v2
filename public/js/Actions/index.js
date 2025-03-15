// Actions/index.js
import { Action } from './Action.js';
import { StatusEffectRegistry } from './StatusEffects.js';

// Export everything properly
export { Action, StatusEffectRegistry };

// Export constants as a proper object
export const ActionTypes = {
  ATTACK: 'attack',
  CAST: 'cast',
  PASSIVE: 'passive'
};

// Create and export the ActionRegistry
export const ActionRegistry = {};

// Export utility functions
export async function fetchAbilities() {
  try {
    const response = await fetch('/api/abilities');
    const abilities = await response.json();
    
    // Create Action objects and store in ActionRegistry
    abilities.forEach(ability => {
      ActionRegistry[ability.id] = new Action(ability);
    });
    
    return ActionRegistry;
  } catch (error) {
    console.error('Error fetching abilities:', error);
    // Set up fallback actions
    return {};
  }
}

export function getAvailableActions() {
  return Object.values(ActionRegistry);
}

export async function fetchAbilitiesForClass(className) {
  try {
    const response = await fetch(`/api/abilities/${className}`);
    const abilities = await response.json();
    return abilities.map(ability => new Action(ability));
  } catch (error) {
    console.error(`Error fetching abilities for ${className}:`, error);
    return []; // Return empty array as fallback
  }
}

export function getAction(actionId) {
  return ActionRegistry[actionId];
}

// Initialize actions when this module is imported
fetchAbilities();