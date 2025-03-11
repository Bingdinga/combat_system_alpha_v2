# Combat System Alpha

A real-time multiplayer combat game system that allows players to join rooms, form parties, and engage in real-time combat against AI enemies.

## Overview

Combat System Alpha is a web-based multiplayer game where:
- Players can join rooms with a custom username
- Multiple players can cooperate in the same room
- Combat happens in real-time with an action point system
- Players can perform various actions (attack, defend, cast spells)
- AI enemies dynamically respond to player actions

## Key Features

- **Real-time Action System**: Time-based recharging action points instead of turn-based gameplay
- **Multiplayer Cooperation**: Join forces with other players to defeat enemies
- **Dynamic Combat**: Continuous action as players' action points recharge independently
- **Various Combat Actions**: Attack, defend, cast spells with different effects
- **Status Effects System**: Apply and manage buffs and debuffs during combat

## Project Structure

```
/combat-system-alpha
├── public/                    # Frontend assets and client-side code
│   ├── index.html             # Main HTML entry point
│   ├── styles.css             # Global CSS styles
│   ├── js/                    # Client-side JavaScript modules
│   │   ├── main.js            # Client entry point and initialization
│   │   ├── Socket.js          # Socket.io wrapper for client-server communication
│   │   ├── CombatManager.js   # Client-side combat state and action management
│   │   ├── CombatUI.js        # UI rendering and management for combat
│   │   ├── Actions.js         # Combat action definitions and calculations
│   │   └── Entities.js        # Player and Enemy class definitions
│   └── assets/                # Game images and assets
│
└── server/                    # Backend server code
    ├── server.js              # Server entry point, Express and Socket.io setup
    ├── RoomManager.js         # Manages player rooms and connections
    ├── CombatManager.js       # Server-side combat logic and state management
    └── package.json           # Node.js dependencies
```

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- NPM or Yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/combat-system-alpha.git
cd combat-system-alpha
```

2. Install dependencies:
```bash
cd server
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## How to Play

1. Enter your username and a room ID to join
2. Wait for other players or start combat immediately
3. Use action points to perform combat actions:
   - Attack: Deal physical damage to enemies
   - Defend: Increase your defense temporarily
   - Cast Spell: Use energy to deal magical damage
4. Combat ends when all enemies or all players are defeated

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.