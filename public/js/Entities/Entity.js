// /public/js/Entities/Entity.js

export class Entity {
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
        this.actionRechargeRate = data.actionRechargeRate || 5000;
        this.lastActionTime = data.lastActionTime || Date.now();

        // Updated ability scores: direct modifier system
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

    getAC() {
        let baseAC = this.ac;

        for (const effect of this.statusEffects) {
            if (effect.type === 'acBuff') {
                baseAC += effect.value;
            } else if (effect.type === 'acDebuff') {
                baseAC -= effect.value;
            }
        }

        return baseAC;
    }

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

        if (data.abilityScores) {
            this.abilityScores = data.abilityScores;
        }

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
        let modifier = this.calculateStatModifier(statName);
        return Math.max(0, baseValue + modifier);
    }

    calculateStatModifier(statName) {
        return this.statusEffects.reduce((modifier, effect) => {
            // Try to use registry first
            const registryEntry = window.StatusEffectRegistry?.[effect.type];
            if (registryEntry?.affectedStat === statName) {
                return modifier + effect.value;
            }
            
            // Legacy fallback
            if (effect.type === `${statName}Buff`) {
                return modifier + effect.value;
            }
            if (effect.type === `${statName}Debuff`) {
                return modifier - effect.value;
            }
            
            return modifier;
        }, 0);
    }
}