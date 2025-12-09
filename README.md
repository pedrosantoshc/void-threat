# Void Threat - Mobile Game App

A mobile social deduction game where players compete in hidden-role gameplay. One faction (Aliens) secretly eliminates crew members at night, while the crew must identify and eliminate all aliens during the day.

## 🎮 Game Overview

**Void Threat** is a mobile social deduction game (similar to Werewolf/Mafia) with app-assisted gameplay for in-person sessions. Players use the React Native app for role management while playing live together.

### Key Features
- **Hidden Roles**: 26 unique roles with special abilities
- **Live Play**: In-person gameplay with app state management
- **Balanced Gameplay**: Sophisticated role balance system
- **Real-time Updates**: Supabase real-time for phase transitions
- **Guest Support**: Play without account creation

## 🛠 Tech Stack

- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **State Management**: Zustand
- **UI Framework**: React Native Paper
- **Navigation**: React Navigation
- **Version Control**: Git + GitHub

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/void-threat.git
   cd void-threat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Update `src/config/supabase.ts` with your project credentials
   - Run the database schema from `supabase/schema.sql`

4. **Start development server**
   ```bash
   npm start
   ```

## 📱 Game Flow

### Setup Phase
1. Moderator creates game and shares code/QR
2. Players join using game code or QR scan
3. Roles are assigned automatically
4. Game begins with Night 1

### Gameplay Loop
- **Night Phase**: Players perform secret actions via app
- **Day Phase**: Live discussion and voting to eliminate suspects
- **Phase Transitions**: Automatic via app with real-time updates

### Win Conditions
- **Crew Wins**: All aliens eliminated
- **Aliens Win**: Aliens equal or outnumber crew
- **Rogue Alien**: Solo alien victory
- **Predator**: Independent hunter victory

## 🎯 Project Status

### ✅ Completed
- Project initialization with TypeScript
- Complete database schema with security policies
- Type definitions for all game entities
- Zustand state management setup
- Navigation structure
- Role definitions and balance system
- Core game logic utilities
- Dark theme matching design specifications

### 🚧 In Progress
- UI screen implementations
- Authentication flow
- Game creation and joining
- Real-time phase management

### 📋 Upcoming
- Role-specific night actions
- Voting and elimination system
- Game end conditions
- Statistics tracking
- Testing and polish

## 🏗 Architecture

### Database Schema
- **games**: Game sessions and state
- **game_players**: Player roles and status
- **night_actions**: Secret night abilities
- **day_eliminations**: Voting results
- **links**: Special role connections (Cupid, Clone, etc.)
- **amulets**: Special items and powers
- **game_logs**: Full game history

### State Management
Zustand store manages:
- Current game session
- Player list and roles
- Night actions and results
- Phase transitions
- Real-time updates

## 📖 Documentation

- **PRD.md**: Complete product requirements and game rules
- **Claude.md**: AI agent roles and development workflow
- **supabase/schema.sql**: Database schema and security policies

## 🤝 Development Workflow

This project uses AI-assisted development with clear role separation:
- **Claude**: Architecture, game logic, backend integration
- **ChatGPT-5**: UI components and screen implementations
- **GitHub**: Version control and collaboration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎮 Game Rules

For complete game rules, role descriptions, and mechanics, see [PRD.md](./PRD.md).

---

*Built with ❤️ for social deduction game enthusiasts*