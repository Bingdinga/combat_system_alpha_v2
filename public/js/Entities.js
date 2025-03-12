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

        // New D&D ability scores
        this.abilityScores = data.abilityScores || {
            strength: 10,     // Physical power, melee attacks
            dexterity: 10,    // Agility, ranged attacks, AC
            constitution: 10, // Health, hit points
            intelligence: 10, // Learning, arcane magic
            wisdom: 10,       // Awareness, divine magic
            charisma: 10      // Force of personality
        };

        // AC calculation based on dexterity
        this.ac = data.ac || 10 + this.getAbilityModifier('dexterity');

        // Legacy stats still used in existing code
        this.stats = data.stats || {
            attack: 10,
            defense: 5,
            magicPower: 8
        };
        this.statusEffects = data.statusEffects || [];
    }

    // Calculate ability modifier from score
    getAbilityModifier(abilityName) {
        const score = this.abilityScores[abilityName];
        return Math.floor((score - 10) / 2);
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

    // Check if entity is alive
    isAlive() {
        return this.health > 0;
    }

    // Get health percentage
    getHealthPercentage() {
        return Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
    }

    // Get energy percentage
    getEnergyPercentage() {
        return Math.max(0, Math.min(100, (this.energy / this.maxEnergy) * 100));
    }

    // Get action points percentage (for progress bar)
    getActionPointsPercentage() {
        // This calculates the percentage to the next full action point
        const fullPoints = Math.floor(this.actionPoints);
        const partialPoint = this.actionPoints - fullPoints;
        return partialPoint * 100;
    }

    // Update from server data
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

    // Check if entity can perform an action (has at least 1 action point)
    canAct() {
        return this.actionPoints >= 1 && this.isAlive();
    }

    // Update getEffectiveStat method
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

    // Calculate damage to be dealt to a target
    calculateDamage(targetEntity, actionType) {
        let damage = 0;

        if (actionType === 'attack') {
            // Physical attack
            const attackPower = this.getEffectiveStat('attack');
            const variation = 0.2; // ±20% damage variation
            const randomFactor = 1 - variation + (Math.random() * variation * 2);
            damage = attackPower * randomFactor;
        } else if (actionType === 'cast') {
            // Magic attack
            const magicPower = this.getEffectiveStat('magicPower');
            const variation = 0.3; // ±30% damage variation
            const randomFactor = 1 - variation + (Math.random() * variation * 2);
            damage = magicPower * randomFactor;
        }

        // Apply target's defense
        const defense = targetEntity.getEffectiveStat('defense');
        damage = Math.max(1, damage - (defense * 0.5));

        return Math.floor(damage);
    }
}

// Add this near the top of the file, after the Entity class but before the PlayerEntity class

// Character class definitions (to be expanded)
const CharacterClasses = {
    FIGHTER: {
        name: 'Fighter',
        description: 'Masters of martial combat, skilled with a variety of weapons and armor.',
        baseAbilityScores: {
            strength: 15,
            dexterity: 12,
            constitution: 14,
            intelligence: 8,
            wisdom: 10,
            charisma: 10
        },
        baseAC: 15, // Chain mail
        abilities: ['Second Wind', 'Action Surge']
    },
    WIZARD: {
        name: 'Wizard',
        description: 'Scholarly magic-users capable of manipulating the structures of reality.',
        baseAbilityScores: {
            strength: 8,
            dexterity: 14,
            constitution: 12,
            intelligence: 15,
            wisdom: 10,
            charisma: 10
        },
        baseAC: 12, // Mage armor
        abilities: ['Arcane Recovery', 'Spell Mastery']
    },
    ROGUE: {
        name: 'Rogue',
        description: 'Skilled tricksters who use stealth and cunning to overcome obstacles.',
        baseAbilityScores: {
            strength: 10,
            dexterity: 15,
            constitution: 12,
            intelligence: 13,
            wisdom: 10,
            charisma: 12
        },
        baseAC: 14, // Leather armor + high dex
        abilities: ['Sneak Attack', 'Cunning Action']
    }
};

// Add this to the PlayerEntity class
class PlayerEntity extends Entity {
    constructor(data) {
        super(data);
        this.isLocalPlayer = data.isLocalPlayer || false;
        this.characterClass = data.characterClass || null;
    }

    // Method to set character class
    setCharacterClass(className) {
        const classTemplate = CharacterClasses[className];
        if (!classTemplate) return false;

        this.characterClass = className;

        // Apply class base stats (in a real implementation, you'd want to
        // account for existing modifications rather than overwriting)
        this.abilityScores = { ...classTemplate.baseAbilityScores };
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

window.createEntity = createEntity; // Add this line to make it globally available