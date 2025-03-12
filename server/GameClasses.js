// GameClasses.js - Defines character classes and abilities

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
        baseHealth: 70, // New higher health value
        abilities: ['Second Wind', 'Action Surge'],
        hitDie: 10 // d10 hit die
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
        baseHealth: 40, // New lower health value
        abilities: ['Arcane Recovery', 'Spell Mastery'],
        spells: ['Magic Missile', 'Shield', 'Fireball'],
        hitDie: 6 // d6 hit die
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
        baseHealth: 50, // Medium health value
        abilities: ['Sneak Attack', 'Cunning Action'],
        hitDie: 8 // d8 hit die
    }
};

module.exports = { CharacterClasses };