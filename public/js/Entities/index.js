// Entities/index.js
import { Entity } from './Entity.js';
import { PlayerEntity } from './PlayerEntity.js';
import { EnemyEntity } from './EnemyEntity.js';

// Export a factory function instead of attaching to window
export function createEntity(data) {
  if (data.type === 'player') {
    return new PlayerEntity(data);
  } else if (data.type === 'enemy') {
    return new EnemyEntity(data);
  }
  return new Entity(data);
}

// Export classes and other functions
export { Entity, PlayerEntity, EnemyEntity };

// Export CharacterClasses for access elsewhere
export let CharacterClasses = {};

// Fetch character classes and update the exported variable
export async function fetchCharacterClasses() {
  try {
    const response = await fetch('/api/classes');
    const classes = await response.json();
    CharacterClasses = classes; // Update the exported variable
    return classes;
  } catch (error) {
    console.error('Error fetching character classes:', error);
    return {}; // Return empty object as fallback
  }
}

// Initialize character classes when this module is imported
fetchCharacterClasses();