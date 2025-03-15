// Entities.js - Entity classes for players and enemies

// Base Entity class
class Entity {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.health = data.health || 100;
        this.maxHealth = data.maxHealth || 100;
        this.energy = data.energy || 100;
        this.maxEnergy = data.maxEnergy || 100;
        this.actionPoints = data.actionPoints || 0;
        this.maxActionPoints = data.maxActionPoints || 3;
        this.actionTimer = data.actionTimer || 0;
        this.actionRechargeRate = data.actionRechargeRate || 5000; // milliseconds per action point
        this.lastActionTime = data.lastActionTime || Date.now();

        // Updated ability scores: direct modifier system in [-13, 13] range
        this.abilityScores = data.abilityScores || {
            strength: 0,
            dexterity: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0
        };

        // AC calculation based directly on dexterity
        this.ac = data.ac || 10 + (this.abilityScores.dexterity);

        // Legacy stats still used in existing code
        this.stats = data.stats || {
            attack: 10,
            defense: 5,
            magicPower: 8
        };
        this.statusEffects = data.statusEffects || [];
    }

    // Get current AC including effects
    getAC() {
        let baseAC = this.ac;

        // Apply AC bonuses from status effects
        for (const effect of this.statusEffects) {
            if (effect.type === 'acBuff') {
                baseAC += effect.value;
            } else if (effect.type === 'acDebuff') {
                baseAC -= effect.value;
            }
        }

        return baseAC;
    }

    // Other methods remain the same...
    isAlive() {
        return this.health > 0;
    }

    getHealthPercentage() {
        return Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
    }

    getEnergyPercentage() {
        return Math.max(0, Math.min(100, (this.energy / this.maxEnergy) * 100));
    }

    getActionPointsPercentage() {
        const fullPoints = Math.floor(this.actionPoints);
        const partialPoint = this.actionPoints - fullPoints;
        return partialPoint * 100;
    }

    update(data) {
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.energy = data.energy;
        this.maxEnergy = data.maxEnergy;
        this.actionPoints = data.actionPoints;
        this.maxActionPoints = data.maxActionPoints;
        this.actionTimer = data.actionTimer;
        this.lastActionTime = data.lastActionTime;

        // Update ability scores if present
        if (data.abilityScores) {
            this.abilityScores = data.abilityScores;
        }

        // Update AC if present
        if (data.ac !== undefined) {
            this.ac = data.ac;
        }

        this.stats = data.stats;
        this.statusEffects = data.statusEffects;
    }

    canAct() {
        return this.actionPoints >= 1 && this.isAlive();
    }

    getEffectiveStat(statName) {
        let baseValue = this.stats[statName] || 0;
        let modifier = 0;

        // Apply relevant status effects
        for (const effect of this.statusEffects) {
            const effectType = effect.type;
            const registryEntry = window.StatusEffectRegistry && window.StatusEffectRegistry[effectType];

            if (registryEntry && registryEntry.affectedStat === statName) {
                // Apply modifier if this effect impacts this stat
                modifier += effect.value;
            } else if (effectType === `${statName}Buff`) {
                // Fallback for legacy code
                modifier += effect.value;
            } else if (effectType === `${statName}Debuff`) {
                // Fallback for legacy code
                modifier -= effect.value;
            }
        }

        return Math.max(0, baseValue + modifier);
    }

    // calculateDamage(targetEntity, actionType) {
    //     let damage = 0;

    //     if (actionType === 'attack') {
    //         // Physical attack
    //         const attackPower = this.getEffectiveStat('attack');
    //         const variation = 0.2; // ±20% damage variation
    //         const randomFactor = 1 - variation + (Math.random() * variation * 2);
    //         damage = attackPower * randomFactor;
    //     } else if (actionType === 'cast') {
    //         // Magic attack
    //         const magicPower = this.getEffectiveStat('magicPower');
    //         const variation = 0.3; // ±30% damage variation
    //         const randomFactor = 1 - variation + (Math.random() * variation * 2);
    //         damage = magicPower * randomFactor;
    //     }

    //     // Apply target's defense
    //     const defense = targetEntity.getEffectiveStat('defense');
    //     damage = Math.max(1, damage - (defense * 0.5));

    //     return Math.floor(damage);
    // }
}

// Client-side character class cache
window.CharacterClasses = {};

// Function to fetch character classes from server
async function fetchCharacterClasses() {
    try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
            throw new Error('Failed to fetch character classes');
        }
        const classes = await response.json();
        window.CharacterClasses = classes;
        console.log('Character classes loaded from server:', classes);
        return classes;
    } catch (error) {
        console.error('Error fetching character classes:', error);
        // Return default classes as fallback
        return {
            FIGHTER: {
                name: 'Fighter',
                description: 'Masters of martial combat, skilled with weapons and armor.',
                baseAbilityScores: {
                    strength: 5,
                    dexterity: 1,
                    constitution: 3,
                    intelligence: -1,
                    wisdom: 0
                },
                baseAC: 15,
                abilities: ['Second Wind', 'Action Surge']
            },
            WIZARD: {
                name: 'Wizard',
                description: 'Scholarly magic-users capable of manipulating reality.',
                baseAbilityScores: {
                    strength: -1,
                    dexterity: 2,
                    constitution: 1,
                    intelligence: 5,
                    wisdom: 0
                },
                baseAC: 12,
                abilities: ['Arcane Recovery', 'Spell Mastery']
            },
            ROGUE: {
                name: 'Rogue',
                description: 'Skilled tricksters who use stealth and cunning.',
                baseAbilityScores: {
                    strength: 0,
                    dexterity: 5,
                    constitution: 1,
                    intelligence: 2,
                    wisdom: 0
                },
                baseAC: 14,
                abilities: ['Sneak Attack', 'Cunning Action']
            }
        };
    }
}

// Load character classes when the script loads
fetchCharacterClasses();

// PlayerEntity class
class PlayerEntity extends Entity {
    constructor(data) {
        super(data);
        this.isLocalPlayer = data.isLocalPlayer || false;
        this.characterClass = data.characterClass || null;

        // Apply class attributes if class is set
        if (this.characterClass && window.CharacterClasses[this.characterClass]) {
            this.applyClassAttributes(this.characterClass);
        }
    }

    // Method to set character class
    setCharacterClass(className) {
        if (!window.CharacterClasses[className]) {
            console.error(`Character class ${className} not found`);
            return false;
        }

        this.characterClass = className;
        return this.applyClassAttributes(className);
    }

    // Apply class attributes based on CharacterClasses definition
    applyClassAttributes(className) {
        const classTemplate = window.CharacterClasses[className];
        if (!classTemplate) return false;

        // Apply class base ability scores
        this.abilityScores = { ...classTemplate.baseAbilityScores };

        // Apply class AC
        this.ac = classTemplate.baseAC;

        return true;
    }
}

// Enemy Entity class
class EnemyEntity extends Entity {
    constructor(data) {
        super(data);
    }
}

// Factory function to create the appropriate entity type
function createEntity(data) {
    if (data.type === 'player') {
        return new PlayerEntity(data);
    } else if (data.type === 'enemy') {
        return new EnemyEntity(data);
    }

    // Default case
    return new Entity(data);
}

window.createEntity = createEntity; // Make it globally available