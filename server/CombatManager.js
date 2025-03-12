const { v4: uuidv4 } = require('uuid');
const { CharacterClasses } = require('./GameClasses');

class CombatManager {
  constructor(io, roomManager) {
    this.io = io;
    this.roomManager = roomManager;
    this.combats = new Map(); // roomId -> combatState

    // Start NPC AI processing loop
    setInterval(() => this.processNpcAi(), 1000);
  }

  // Initialize a new combat for a room
  initiateCombat(roomId) {
    // Check if room exists and is not already in combat
    if (this.roomManager.isRoomInCombat(roomId)) {
      return;
    }

    // Get players in the room
    const players = this.roomManager.getPlayersInRoom(roomId);
    if (players.length === 0) {
      return;
    }

    // Set up player entities from room players with character classes
    const playerEntities = players.map(player => {
      // Get class template and create base entity
      const classTemplate = CharacterClasses[player.characterClass] || {
        name: 'Adventurer',
        baseAbilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10
        },
        baseAC: 10,
        abilities: []
      };

      // Calculate modifiers
      const strMod = Math.floor((classTemplate.baseAbilityScores.strength - 10) / 2);
      const dexMod = Math.floor((classTemplate.baseAbilityScores.dexterity - 10) / 2);
      const conMod = Math.floor((classTemplate.baseAbilityScores.constitution - 10) / 2);
      const intMod = Math.floor((classTemplate.baseAbilityScores.intelligence - 10) / 2);
      const wisMod = Math.floor((classTemplate.baseAbilityScores.wisdom - 10) / 2);
      const chaMod = Math.floor((classTemplate.baseAbilityScores.charisma - 10) / 2);

      // Set base HP according to class with the new values
      let baseHP = 50; // Default
      if (player.characterClass === 'FIGHTER') baseHP = 70;
      else if (player.characterClass === 'WIZARD') baseHP = 40;
      else if (player.characterClass === 'ROGUE') baseHP = 50;

      // Add constitution modifier to base HP
      const maxHealth = baseHP + conMod;

      return {
        id: player.id,
        name: player.username,
        type: 'player',
        characterClass: player.characterClass,
        health: maxHealth,
        maxHealth: maxHealth,
        energy: 100,
        maxEnergy: 100,
        actionPoints: 3.0,
        maxActionPoints: 3,
        actionTimer: 0,
        actionRechargeRate: 5000, // 5 seconds per action point
        lastActionTime: Date.now(),
        abilityScores: { ...classTemplate.baseAbilityScores },
        ac: classTemplate.baseAC,
        stats: {
          attack: 10 + strMod,
          defense: 5 + dexMod,
          magicPower: 8 + (player.characterClass === 'WIZARD' ? intMod : wisMod)
        },
        statusEffects: []
      };
    });

    // Generate enemies based on number of players
    const enemies = this.generateEnemies(players.length);

    // Create combat state
    const combatState = {
      id: uuidv4(),
      roomId: roomId,
      startTime: Date.now(),
      entities: [...playerEntities, ...enemies],
      log: [{
        time: Date.now(),
        message: 'Combat has begun!'
      }],
      active: true
    };

    // Store combat state
    this.combats.set(roomId, combatState);

    // Mark room as in combat
    this.roomManager.setRoomCombatStatus(roomId, true);

    // Notify all players in the room
    this.io.to(roomId).emit('combatInitiated', combatState);

    console.log(`Combat initiated in room ${roomId}`);
    return combatState;
  }

  // Generate enemy entities based on player count
  generateEnemies(playerCount) {
    const enemyCount = Math.max(1, Math.floor(playerCount * 1.5));
    const enemies = [];

    const enemyRechargeMult = 3;

    const enemyTypes = [
      {
        name: 'Goblin',
        health: 30,
        attack: 8,
        defense: 3,
        actionRechargeRate: 7000 * enemyRechargeMult,
        abilityScores: {
          strength: 8,
          dexterity: 14,
          constitution: 10,
          intelligence: 10,
          wisdom: 8,
          charisma: 8
        },
        ac: 13 // Base AC for goblin
      },
      {
        name: 'Orc',
        health: 50,
        attack: 12,
        defense: 6,
        actionRechargeRate: 9000 * enemyRechargeMult,
        abilityScores: {
          strength: 16,
          dexterity: 12,
          constitution: 16,
          intelligence: 7,
          wisdom: 11,
          charisma: 10
        },
        ac: 13 // Base AC for orc 
      },
      {
        name: 'Troll',
        health: 70,
        attack: 15,
        defense: 8,
        actionRechargeRate: 13000 * enemyRechargeMult,
        abilityScores: {
          strength: 18,
          dexterity: 13,
          constitution: 20,
          intelligence: 7,
          wisdom: 9,
          charisma: 7
        },
        ac: 15 // Base AC for troll
      }
    ];

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push({
        id: `enemy-${uuidv4()}`,
        name: `${enemyType.name} ${i + 1}`,
        type: 'enemy',
        health: enemyType.health,
        maxHealth: enemyType.health,
        energy: 100,
        maxEnergy: 100,
        actionPoints: 3,
        maxActionPoints: 3,
        actionTimer: 0,
        actionRechargeRate: enemyType.actionRechargeRate,
        lastActionTime: Date.now(),
        abilityScores: enemyType.abilityScores,
        ac: enemyType.ac,
        stats: {
          attack: enemyType.attack,
          defense: enemyType.defense,
          magicPower: 5
        },
        statusEffects: []
      });
    }

    return enemies;
  }

  // Process player action
  handlePlayerAction(socketId, actionData) {
    // Get room ID
    const roomId = this.roomManager.getSocketRoom(socketId);
    if (!roomId) return;

    // Get combat state
    const combat = this.combats.get(roomId);
    if (!combat || !combat.active) return;

    // Find the player entity
    const playerEntity = combat.entities.find(entity => entity.id === socketId);
    if (!playerEntity) return;

    // Check if player has enough action points
    if (playerEntity.actionPoints < 1) {
      // console.log(`Player ${socketId} attempted action with insufficient points: ${playerEntity.actionPoints}`);
      return;
    }

    // Process the action based on type
    const result = this.processAction(combat, playerEntity, actionData);
    if (!result) return;

    // Consume exactly 1 action point
    playerEntity.actionPoints = Math.max(0, Math.floor(playerEntity.actionPoints) - 1 + (playerEntity.actionPoints % 1));
    playerEntity.lastActionTime = Date.now();

    // console.log(`Player ${socketId} action points: ${playerEntity.actionPoints} after action`);
    // Add detailed log entry
    combat.log.push({
      time: Date.now(),
      actor: result.actorName,
      actorId: result.actorId,
      actorType: 'player',
      action: actionData.type,
      target: result.targetName,
      targetId: result.targetId,
      message: result.message,
      details: result.details
    });

    // Check for combat end conditions
    this.checkCombatEnd(combat);

    // Send updated combat state to all players
    this.io.to(roomId).emit('combatUpdated', combat);
  }

  // Process an action (attack, defend, cast spell)
  processAction(combat, actor, actionData) {
    // Find target entity
    const target = combat.entities.find(entity => entity.id === actionData.targetId);
    if (!target) return null;

    let result = {
      actorId: actor.id,
      targetId: target.id,
      actorName: actor.name,
      targetName: target.name,
      actionType: actionData.type,
      message: '',
      details: {} // Additional details about the action
    };

    // Declare variables that might be used across different cases
    let d20Roll, attackModifier, attackRoll, targetAC;
    let baseDamage, damage, mitigated;
    let spellCost, spellType, spellAbility, spellAbilityMod, healAbility, healAbilityMod;
    let spellAttackBonus, spellAttackRoll, saveDC, targetDexMod, targetSaveRoll;
    let buffValue, buffDuration, buff;
    let healRoll, healAmount, healedHealth, actualHealAmount;
    let damageRoll1, damageRoll2, totalDamage, halfDamage;
    let oldActionPoints, actionPointsGained;

    switch (actionData.type) {
      case 'attack':
        // D&D style attack roll (d20 + modifier against AC)
        d20Roll = Math.floor(Math.random() * 20) + 1; // 1-20
        attackModifier = actor.abilityScores ?
          Math.floor((actor.abilityScores.strength - 10) / 2) :
          Math.floor(actor.stats.attack / 3);

        attackRoll = d20Roll + attackModifier;
        targetAC = target.ac || 10 + Math.floor(target.stats.defense / 2);

        result.details = {
          d20Roll: d20Roll,
          attackModifier: attackModifier,
          totalAttackRoll: attackRoll,
          targetAC: targetAC,
          attackType: 'melee',
          actorType: actor.type
        };

        // Critical hit on natural 20
        if (d20Roll === 20) {
          baseDamage = actor.stats.attack * (Math.random() * 0.3 + 0.85);
          damage = Math.floor(baseDamage * 2); // Double damage on crit

          target.health = Math.max(0, target.health - damage);

          result.details.damage = damage;
          result.details.targetHealthBefore = target.health + damage;
          result.details.targetHealthAfter = target.health;
          result.details.isCritical = true;

          result.message = `${actor.name} rolled a natural 20! Critical hit on ${target.name} for ${damage} damage!`;
        }
        // Critical failure on natural 1
        else if (d20Roll === 1) {
          result.details.isCriticalFail = true;
          result.message = `${actor.name} rolled a natural 1! Critical miss against ${target.name}!`;
        }
        // Normal hit/miss logic
        else if (attackRoll >= targetAC) {
          // Hit - calculate damage
          baseDamage = actor.stats.attack * (Math.random() * 0.5 + 0.75);
          damage = Math.floor(baseDamage);

          target.health = Math.max(0, target.health - damage);

          result.details.damage = damage;
          result.details.targetHealthBefore = target.health + damage;
          result.details.targetHealthAfter = target.health;
          result.details.isHit = true;

          result.message = `${actor.name} rolled ${attackRoll} vs AC ${targetAC} and hit ${target.name} for ${damage} damage!`;
        } else {
          // Miss
          result.details.isHit = false;
          result.message = `${actor.name} rolled ${attackRoll} vs AC ${targetAC} and missed ${target.name}!`;
        }
        break;

      case 'cast':
        // Check energy cost
        spellCost = 20;

        if (actor.energy < spellCost) {
          result.message = `${actor.name} doesn't have enough energy to cast the spell!`;
          return result;
        }

        // Get spell type from action data
        spellType = actionData.spellType || 'fireball'; // Default to fireball

        switch (spellType) {
          case 'fireball':
            // DnD style attack roll for spells - use Intelligence for wizards, Wisdom otherwise
            spellAbility = actor.characterClass === 'WIZARD' ? 'intelligence' : 'wisdom';
            spellAbilityMod = Math.floor((actor.abilityScores[spellAbility] - 10) / 2);

            // Spell attack roll
            d20Roll = Math.floor(Math.random() * 20) + 1; // 1-20
            spellAttackBonus = spellAbilityMod;
            spellAttackRoll = d20Roll + spellAttackBonus;

            // Target's save DC
            saveDC = 8 + spellAbilityMod + 2; // 8 + ability modifier + proficiency bonus (2)

            // Store core details for all outcomes
            result.details = {
              spellType: 'fireball',
              d20Roll: d20Roll,
              spellAttackBonus: spellAttackBonus,
              totalSpellRoll: spellAttackRoll,
              energyCost: spellCost,
              actorEnergyBefore: actor.energy,
              actorType: actor.type
            };

            // Critical hit
            if (d20Roll === 20) {
              // Calculate spell damage (2d6 for fireball)
              damageRoll1 = Math.floor(Math.random() * 6) + 1;
              damageRoll2 = Math.floor(Math.random() * 6) + 1;
              damage = damageRoll1 + damageRoll2 + spellAbilityMod;

              // Double damage on crit
              totalDamage = damage * 2;

              // Apply damage
              target.health = Math.max(0, target.health - totalDamage);
              actor.energy -= spellCost;

              // Update details
              result.details.spellDamage = totalDamage;
              result.details.isCritical = true;
              result.details.targetHealthBefore = target.health + totalDamage;
              result.details.targetHealthAfter = target.health;
              result.details.actorEnergyAfter = actor.energy;

              result.message = `${actor.name} rolled a natural 20! Critical Fireball hits ${target.name} for ${totalDamage} fire damage!`;
            }
            // Critical failure
            else if (d20Roll === 1) {
              actor.energy -= spellCost;

              result.details.isCriticalFail = true;
              result.details.actorEnergyAfter = actor.energy;

              result.message = `${actor.name} rolled a natural 1! The Fireball fizzles out harmlessly!`;
            }
            // Normal hit/miss
            else {
              // We use Dexterity saving throw against spellcaster's DC
              targetDexMod = Math.floor((target.abilityScores.dexterity - 10) / 2);
              targetSaveRoll = Math.floor(Math.random() * 20) + 1 + targetDexMod;

              // Calculate base damage
              damageRoll1 = Math.floor(Math.random() * 6) + 1;
              damageRoll2 = Math.floor(Math.random() * 6) + 1;
              baseDamage = damageRoll1 + damageRoll2 + spellAbilityMod;

              actor.energy -= spellCost;
              result.details.actorEnergyAfter = actor.energy;
              result.details.saveDC = saveDC;
              result.details.targetSaveRoll = targetSaveRoll;

              // Failed save takes full damage
              if (targetSaveRoll < saveDC) {
                target.health = Math.max(0, target.health - baseDamage);

                result.details.spellDamage = baseDamage;
                result.details.saveSuccess = false;
                result.details.targetHealthBefore = target.health + baseDamage;
                result.details.targetHealthAfter = target.health;

                result.message = `${actor.name}'s Fireball hits ${target.name} (DC ${saveDC} vs ${targetSaveRoll}). ${target.name} takes ${baseDamage} fire damage!`;
              }
              // Successful save takes half damage
              else {
                halfDamage = Math.floor(baseDamage / 2);
                target.health = Math.max(0, target.health - halfDamage);

                result.details.spellDamage = halfDamage;
                result.details.saveSuccess = true;
                result.details.targetHealthBefore = target.health + halfDamage;
                result.details.targetHealthAfter = target.health;

                result.message = `${actor.name} casts Fireball, but ${target.name} partially dodges it (DC ${saveDC} vs ${targetSaveRoll}). ${target.name} takes ${halfDamage} fire damage!`;
              }
            }
            break;

          case 'shield':
            // Shield spell - boost AC temporarily (like D&D)
            const shieldACBoost = 5;
            const shieldDuration = 3; // 3 turns

            // Create AC buff effect
            buff = {
              id: uuidv4(),
              type: 'acBuff',
              value: shieldACBoost,
              duration: shieldDuration,
              applied: Date.now()
            };

            // Apply buff to target (self)
            actor.statusEffects.push(buff);
            actor.energy -= spellCost;

            // Store details
            result.details = {
              spellType: 'shield',
              buffValue: shieldACBoost,
              buffDuration: shieldDuration,
              energyCost: spellCost,
              actorEnergyBefore: actor.energy + spellCost,
              actorEnergyAfter: actor.energy,
              actorType: actor.type
            };

            result.message = `${actor.name} casts Shield, increasing AC by ${shieldACBoost} for ${shieldDuration} rounds!`;
            break;

          case 'heal':
            // Healing Word spell - 1d4 + ability modifier
            healAbility = 'wisdom'; // Use Wisdom for healing
            healAbilityMod = Math.floor((actor.abilityScores[healAbility] - 10) / 2);

            healRoll = Math.floor(Math.random() * 4) + 1; // 1d4
            healAmount = healRoll + healAbilityMod;

            // Apply healing (capped at max health)
            healedHealth = Math.min(target.maxHealth, target.health + healAmount);
            actualHealAmount = healedHealth - target.health;
            target.health = healedHealth;
            actor.energy -= spellCost;

            // Store details
            result.details = {
              spellType: 'heal',
              healRoll: healRoll,
              healModifier: healAbilityMod,
              healAmount: actualHealAmount,
              energyCost: spellCost,
              targetHealthBefore: target.health - actualHealAmount,
              targetHealthAfter: target.health,
              actorEnergyBefore: actor.energy + spellCost,
              actorEnergyAfter: actor.energy,
              actorType: actor.type
            };

            result.message = `${actor.name} casts Healing Word on ${target.name}, restoring ${actualHealAmount} health!`;
            break;

          case 'second_wind':
            // Fighter's Second Wind: Heal 1d10 + level
            if (actor.characterClass !== 'FIGHTER') {
              return null; // Only fighters can use Second Wind
            }

            healRoll = Math.floor(Math.random() * 10) + 1; // 1d10
            const level = 1; // Starting level
            healAmount = healRoll + level;

            // Apply healing (capped at max health)
            healedHealth = Math.min(actor.maxHealth, actor.health + healAmount);
            actualHealAmount = healedHealth - actor.health;
            actor.health = healedHealth;
            actor.energy -= spellCost;

            // Store details
            result.details = {
              spellType: 'second_wind',
              healRoll: healRoll,
              healAmount: actualHealAmount,
              energyCost: spellCost,
              actorHealthBefore: actor.health - actualHealAmount,
              actorHealthAfter: actor.health,
              actorEnergyBefore: actor.energy + spellCost,
              actorEnergyAfter: actor.energy,
              actorType: actor.type
            };

            result.message = `${actor.name} uses Second Wind, recovering ${actualHealAmount} health!`;
            break;

          case 'cunning_action':
            // Rogue's Cunning Action: Get an extra action point
            if (actor.characterClass !== 'ROGUE') {
              return null; // Only rogues can use Cunning Action
            }

            // Grant an extra action point (capped at max)
            oldActionPoints = actor.actionPoints;
            actor.actionPoints = Math.min(actor.maxActionPoints, actor.actionPoints + 1);
            actionPointsGained = actor.actionPoints - oldActionPoints;
            actor.energy -= spellCost;

            // Store details
            result.details = {
              spellType: 'cunning_action',
              actionPointsBefore: oldActionPoints,
              actionPointsAfter: actor.actionPoints,
              actionPointsGained: actionPointsGained,
              energyCost: spellCost,
              actorEnergyBefore: actor.energy + spellCost,
              actorEnergyAfter: actor.energy,
              actorType: actor.type
            };

            result.message = `${actor.name} uses Cunning Action, gaining an extra action!`;
            break;

          default:
            // Unknown spell type
            return null;
        }
        break;
    }

    // Check if target was defeated
    if (target.health === 0 && result.details.targetHealthBefore > 0) {
      const defeatMessage = `${target.name} has been defeated!`;

      // Add defeat to log separately for better visibility
      combat.log.push({
        time: Date.now(),
        message: defeatMessage,
        type: 'defeat',
        entityId: target.id,
        entityType: target.type
      });
    }

    return result;
  }

  // NPC AI processing loop
  processNpcAi() {
    // Process each active combat
    for (const [roomId, combat] of this.combats.entries()) {
      if (!combat.active) continue;

      let updated = false;

      // Update action points for all entities
      const now = Date.now();
      combat.entities.forEach(entity => {
        // Calculate time since last action
        const timeSinceLastAction = now - entity.lastActionTime;

        // Calculate accumulated action points 
        const newActionPoints = entity.actionPoints + (timeSinceLastAction / entity.actionRechargeRate);

        // Update action points, capped at max
        const previousActionPoints = entity.actionPoints;
        entity.actionPoints = Math.min(entity.maxActionPoints, newActionPoints);

        // Update last action time if action points changed
        if (entity.actionPoints !== previousActionPoints) {
          entity.lastActionTime = now - (timeSinceLastAction % entity.actionRechargeRate);
          updated = true;
        }

        // Process status effect durations
        entity.statusEffects = entity.statusEffects.filter(effect => {
          // Keep effects that still have duration left
          return effect.duration > 0;
        });
      });

      // Process NPC actions
      const enemies = combat.entities.filter(entity => entity.type === 'enemy' && entity.health > 0);
      const players = combat.entities.filter(entity => entity.type === 'player' && entity.health > 0);

      // Skip if no valid targets
      if (players.length === 0 || enemies.length === 0) {
        this.checkCombatEnd(combat);
        continue;
      }

      // Process each enemy
      enemies.forEach(enemy => {
        // Skip if no action points
        if (enemy.actionPoints < 1) return;

        // Select a random player as target
        const randomPlayer = players[Math.floor(Math.random() * players.length)];

        // Perform attack
        const actionData = {
          type: 'attack',
          targetId: randomPlayer.id
        };

        const result = this.processAction(combat, enemy, actionData);
        if (result) {
          // Use an action point
          enemy.actionPoints -= 1;
          enemy.lastActionTime = now;

          // Add detailed log entry
          combat.log.push({
            time: now,
            actor: result.actorName,
            actorId: result.actorId,
            actorType: 'enemy',
            action: 'attack',
            target: result.targetName,
            targetId: result.targetId,
            message: result.message,
            details: result.details
          });

          updated = true;
        }
      });

      // Check combat end conditions
      this.checkCombatEnd(combat);

      // Send updates if needed
      if (updated && combat.active) {
        this.io.to(roomId).emit('combatUpdated', combat);
      }
    }
  }

  // Check if combat has ended
  checkCombatEnd(combat) {
    // Get alive players and enemies
    const alivePlayers = combat.entities.filter(e => e.type === 'player' && e.health > 0);
    const aliveEnemies = combat.entities.filter(e => e.type === 'enemy' && e.health > 0);
    let shouldEndCombat = false;
    let result = '';

    if (alivePlayers.length === 0) {
      // Players lost
      result = 'defeat';
      shouldEndCombat = true;
    } else if (aliveEnemies.length === 0) {
      // Players won
      result = 'victory';
      shouldEndCombat = true;
    }

    if (shouldEndCombat) {
      // Send a final state update before ending combat
      this.io.to(combat.roomId).emit('combatUpdated', combat);

      // Add a small delay before actually ending the combat
      // This gives clients time to process the final state
      setTimeout(() => {
        this.endCombat(combat, result);
      }, 500); // 500ms delay should be sufficient

      return true;
    }

    return false;
  }

  // End combat with result
  endCombat(combat, result) {
    if (!combat.active) return;

    // Set combat inactive
    combat.active = false;
    combat.endTime = Date.now();
    combat.result = result;

    // Add log entry
    combat.log.push({
      time: Date.now(),
      message: result === 'victory' ? 'Victory! All enemies have been defeated!' : 'Defeat! All players have fallen!'
    });

    // Set room combat status
    this.roomManager.setRoomCombatStatus(combat.roomId, false);

    // Notify players
    this.io.to(combat.roomId).emit('combatEnded', {
      result: result,
      combat: combat
    });

    console.log(`Combat ended in room ${combat.roomId} with ${result}`);

    // Clean up combat after a delay
    setTimeout(() => {
      this.combats.delete(combat.roomId);
    }, 60000); // Keep combat data for 1 minute for post-combat review
  }
}

module.exports = CombatManager;