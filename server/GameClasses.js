// server/GameClasses.js
const CharacterClasses = {
    FIGHTER: {
        name: 'Fighter',
        // description: 'Masters of martial combat, skilled with a variety of weapons and armor.',
        description: '...',
        baseAbilityScores: {
            strength: 5,
            dexterity: 1,
            constitution: 3,
            intelligence: -1,
            wisdom: 0
        },
        baseAC: 17,
        baseHealth: 70,
        abilities: ['attack', 'secondWind'],
        hitDie: 10
    },
    WIZARD: {
        name: 'Wizard',
        // description: 'Scholarly magic-users capable of manipulating the structures of reality.',
        description: '...',
        baseAbilityScores: {
            strength: -1,
            dexterity: 2,
            constitution: 1,
            intelligence: 5,
            wisdom: 0
        },
        baseAC: 12,
        baseHealth: 40,
        abilities: ['attack', 'fireball', 'shield'],
        hitDie: 6
    },
    ROGUE: {
        name: 'Rogue',
        // description: 'Skilled tricksters who use stealth and cunning to overcome obstacles.',
        description: '...',
        baseAbilityScores: {
            strength: 0,
            dexterity: 5,
            constitution: 1,
            intelligence: 2,
            wisdom: 0
        },
        baseAC: 14,
        baseHealth: 50,
        abilities: ['attack', 'sneakAttack', 'evasion'],
        hitDie: 8
    }
};

module.exports = { CharacterClasses };