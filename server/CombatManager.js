const { v4: uuidv4 } = require('uuid');
const { CharacterClasses } = require('./GameClasses');
const { getAbility, abilityHandlers } = require('./Abilities');

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
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0
        },
        baseAC: 10,
        abilities: []
      };

      // Use ability scores directly as modifiers
      const strMod = classTemplate.baseAbilityScores.strength;
      const dexMod = classTemplate.baseAbilityScores.dexterity;
      const conMod = classTemplate.baseAbilityScores.constitution;
      const intMod = classTemplate.baseAbilityScores.intelligence;
      const wisMod = classTemplate.baseAbilityScores.wisdom;

      // Set base HP according to class with the new values
      let baseHP = 50; // Default
      if (player.characterClass === 'FIGHTER') baseHP = 70;
      else if (player.characterClass === 'WIZARD') baseHP = 40;
      else if (player.characterClass === 'ROGUE') baseHP = 50;

      // Add constitution directly to base HP
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
    // Change this line to make enemyCount equal to playerCount
    const enemyCount = playerCount; // Previously: Math.max(1, Math.floor(playerCount * 1.5));
    const enemies = [];

    const enemyRechargeMult = 3;

    const enemyTypes = [
      {
        name: 'Goblin',
        health: 30,
        actionRechargeRate: 7000 * enemyRechargeMult,
        abilityScores: {
          strength: 3,
          dexterity: 2,
          constitution: 2,
          intelligence: -1,
          wisdom: -1
        },
        ac: 11 // Base AC for goblin
      },
      {
        name: 'Orc',
        health: 50,
        actionRechargeRate: 9000 * enemyRechargeMult,
        abilityScores: {
          strength: 3,
          dexterity: 2,
          constitution: 3,
          intelligence: -1,
          wisdom: 0
        },
        ac: 13 // Base AC for orc 
      },
      {
        name: 'Troll',
        health: 70,
        actionRechargeRate: 13000 * enemyRechargeMult,
        abilityScores: {
          strength: 5,
          dexterity: -1,
          constitution: 7,
          intelligence: -1,
          wisdom: -1
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
        // Change the max action points to 2 instead of 3
        actionPoints: 2,
        maxActionPoints: 2,  // Changed from 3 to 2
        actionTimer: 0,
        actionRechargeRate: enemyType.actionRechargeRate,
        lastActionTime: Date.now(),
        abilityScores: enemyType.abilityScores,
        ac: enemyType.ac,
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
      return;
    }

    // Process the action based on type
    const result = this.processAction(combat, playerEntity, actionData);
    if (!result) return;

    // Consume exactly 1 action point
    playerEntity.actionPoints = Math.max(0, Math.floor(playerEntity.actionPoints) - 1 + (playerEntity.actionPoints % 1));
    playerEntity.lastActionTime = Date.now();

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

    // Create base result object
    let result = {
      actorId: actor.id,
      targetId: target.id,
      actorName: actor.name,
      targetName: target.name,
      actionType: actionData.type,
      message: '',
      details: {}
    };

    // Determine which ability to use
    const abilityId = actionData.type === 'cast' ? actionData.spellType : actionData.type;

    // Get the ability handler directly from abilityHandlers
    const handler = abilityHandlers[abilityId];
    if (!handler) {
      console.log(`No handler found for ability: ${abilityId}`);
      return null;
    }

    // Execute the ability handler directly
    const abilityResult = handler(combat, actor, target);

    // Update result with ability results
    result.message = abilityResult.message;
    result.details = {
      ...result.details,
      ...abilityResult.details
    };

    // Check if target was defeated
    if (target.health === 0 && target.health < result.details.targetHealthBefore) {
      combat.log.push({
        time: Date.now(),
        message: `${target.name} has been defeated!`,
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