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
        this.stats = data.stats || {
            attack: 10,
            defense: 5,
            magicPower: 8
        };
        this.statusEffects = data.statusEffects || [];
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
        this.stats = data.stats;
        this.statusEffects = data.statusEffects;
    }

    // Check if entity can perform an action (has at least 1 action point)
    canAct() {
        return this.actionPoints >= 1 && this.isAlive();
    }

    // Get effective stat value considering status effects
    getEffectiveStat(statName) {
        let baseValue = this.stats[statName] || 0;
        let modifier = 0;

        // Apply relevant status effects
        for (const effect of this.statusEffects) {
            if (effect.type === `${statName}Buff`) {
                modifier += effect.value;
            } else if (effect.type === `${statName}Debuff`) {
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

// Player Entity class
class PlayerEntity extends Entity {
    constructor(data) {
        super(data);
        this.isLocalPlayer = data.isLocalPlayer || false;
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