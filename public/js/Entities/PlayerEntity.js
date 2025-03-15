// /public/js/Entities/PlayerEntity.js
import { Entity } from './Entity.js';

export class PlayerEntity extends Entity {
    constructor(data) {
        super(data);
        this.isLocalPlayer = data.isLocalPlayer || false;
        this.characterClass = data.characterClass || null;

        // Apply class attributes if class is set
        if (this.characterClass && window.CharacterClasses?.[this.characterClass]) {
            this.applyClassAttributes(this.characterClass);
        }
    }

    setCharacterClass(className) {
        if (!window.CharacterClasses?.[className]) {
            console.error(`Character class ${className} not found`);
            return false;
        }

        this.characterClass = className;
        return this.applyClassAttributes(className);
    }

    applyClassAttributes(className) {
        const classTemplate = window.CharacterClasses?.[className];
        if (!classTemplate) return false;

        // Apply class base ability scores
        this.abilityScores = { ...classTemplate.baseAbilityScores };

        // Apply class AC
        this.ac = classTemplate.baseAC;

        return true;
    }
}