const { v4: uuidv4 } = require('uuid');

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

    // Set up player entities from room players
    const playerEntities = players.map(player => ({
      id: player.id,
      name: player.username,
      type: 'player',
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      actionPoints: 3,
      maxActionPoints: 3,
      actionTimer: 0,
      actionRechargeRate: 5000, // 5 seconds per action point
      lastActionTime: Date.now(),
      stats: {
        attack: 10,
        defense: 5,
        magicPower: 8
      },
      statusEffects: []
    }));

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

    const enemyTypes = [
      { name: 'Goblin', health: 50, attack: 8, defense: 3, actionRechargeRate: 6000 },
      { name: 'Orc', health: 80, attack: 12, defense: 6, actionRechargeRate: 7000 },
      { name: 'Troll', health: 120, attack: 15, defense: 8, actionRechargeRate: 8000 }
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
      return;
    }

    // Process the action based on type
    const result = this.processAction(combat, playerEntity, actionData);
    if (!result) return;

    // Update the player's action points
    playerEntity.actionPoints -= 1;
    playerEntity.lastActionTime = Date.now();

    // Add log entry
    combat.log.push({
      time: Date.now(),
      actor: playerEntity.name,
      action: actionData.type,
      target: result.targetName,
      message: result.message
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
      targetName: target.name,
      message: ''
    };

    switch (actionData.type) {
      case 'attack':
        // Calculate damage
        const baseDamage = actor.stats.attack * (Math.random() * 0.5 + 0.75); // 75-125% of attack
        const mitigated = target.stats.defense * (Math.random() * 0.3 + 0.2); // 20-50% of defense
        const damage = Math.max(1, Math.floor(baseDamage - mitigated));
        
        // Apply damage
        target.health = Math.max(0, target.health - damage);
        
        result.message = `${actor.name} attacked ${target.name} for ${damage} damage!`;
        break;
        
      case 'defend':
        // Apply a defense buff status effect
        const defenseBuff = {
          id: uuidv4(),
          type: 'defenseBuff',
          value: Math.floor(actor.stats.defense * 0.5), // 50% defense increase
          duration: 2, // lasts for 2 actions
          applied: Date.now()
        };
        
        actor.statusEffects.push(defenseBuff);
        result.message = `${actor.name} takes a defensive stance, increasing defense!`;
        break;
        
      case 'cast':
        // Get spell info
        const spellCost = 20; // Energy cost
        
        // Check if enough energy
        if (actor.energy < spellCost) {
          result.message = `${actor.name} doesn't have enough energy to cast the spell!`;
          return result;
        }
        
        // Calculate spell damage
        const spellDamage = Math.floor(actor.stats.magicPower * (Math.random() * 0.6 + 0.9)); // 90-150% of magic power
        
        // Apply damage and cost
        target.health = Math.max(0, target.health - spellDamage);
        actor.energy -= spellCost;
        
        result.message = `${actor.name} cast a spell on ${target.name} for ${spellDamage} damage!`;
        break;
      
      default:
        return null;
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
          
          // Add log entry
          combat.log.push({
            time: now,
            actor: enemy.name,
            action: 'attack',
            target: result.targetName,
            message: result.message
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
    
    // Check win/loss conditions
    if (alivePlayers.length === 0) {
      // Players lost
      this.endCombat(combat, 'defeat');
      return true;
    } else if (aliveEnemies.length === 0) {
      // Players won
      this.endCombat(combat, 'victory');
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