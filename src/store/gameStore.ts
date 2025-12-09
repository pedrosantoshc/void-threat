import { create } from 'zustand';
import { 
  GameSession, 
  GamePlayer, 
  NightAction, 
  DayElimination, 
  Link, 
  Amulet, 
  GameLog,
  AppUser,
  GameState 
} from '../types';

interface GameStore extends GameState {
  // User state
  currentUser: AppUser | null;
  
  // Actions
  setCurrentUser: (user: AppUser | null) => void;
  setCurrentGame: (game: GameSession | undefined) => void;
  setCurrentPlayer: (player: GamePlayer | undefined) => void;
  setPlayers: (players: GamePlayer[]) => void;
  addPlayer: (player: GamePlayer) => void;
  updatePlayer: (playerId: string, updates: Partial<GamePlayer>) => void;
  
  // Night actions
  addNightAction: (action: NightAction) => void;
  getNightActions: (nightNumber: number) => NightAction[];
  
  // Day eliminations
  addDayElimination: (elimination: DayElimination) => void;
  
  // Links (Cupid, Clone, Parasyte)
  addLink: (link: Link) => void;
  updateLink: (linkId: string, updates: Partial<Link>) => void;
  getActiveLinks: () => Link[];
  
  // Amulets
  addAmulet: (amulet: Amulet) => void;
  updateAmulet: (amuletId: string, updates: Partial<Amulet>) => void;
  
  // Game logs
  addGameLog: (log: GameLog) => void;
  
  // Game phase management
  advancePhase: () => void;
  
  // Reset
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentUser: null,
  current_game: undefined,
  current_player: undefined,
  players: [],
  night_actions: [],
  day_eliminations: [],
  links: [],
  amulets: [],
  game_logs: [],

  // User actions
  setCurrentUser: (user) => set({ currentUser: user }),

  // Game actions
  setCurrentGame: (game) => set({ current_game: game }),
  setCurrentPlayer: (player) => set({ current_player: player }),

  // Player management
  setPlayers: (players) => set({ players }),
  
  addPlayer: (player) => set((state) => ({
    players: [...state.players, player]
  })),

  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    )
  })),

  // Night actions
  addNightAction: (action) => set((state) => ({
    night_actions: [...state.night_actions, action]
  })),

  getNightActions: (nightNumber) => {
    return get().night_actions.filter(action => action.night_number === nightNumber);
  },

  // Day eliminations
  addDayElimination: (elimination) => set((state) => ({
    day_eliminations: [...state.day_eliminations, elimination]
  })),

  // Links
  addLink: (link) => set((state) => ({
    links: [...state.links, link]
  })),

  updateLink: (linkId, updates) => set((state) => ({
    links: state.links.map(link => 
      link.id === linkId ? { ...link, ...updates } : link
    )
  })),

  getActiveLinks: () => {
    return get().links.filter(link => link.is_active);
  },

  // Amulets
  addAmulet: (amulet) => set((state) => ({
    amulets: [...state.amulets, amulet]
  })),

  updateAmulet: (amuletId, updates) => set((state) => ({
    amulets: state.amulets.map(amulet => 
      amulet.id === amuletId ? { ...amulet, ...updates } : amulet
    )
  })),

  // Game logs
  addGameLog: (log) => set((state) => ({
    game_logs: [...state.game_logs, log]
  })),

  // Phase management
  advancePhase: () => set((state) => {
    if (!state.current_game) return state;

    const currentPhase = state.current_game.current_phase;
    let newPhase: typeof currentPhase;
    let newNightNumber = state.current_game.night_number;
    let newDayNumber = state.current_game.day_number;

    switch (currentPhase) {
      case 'night1':
        newPhase = 'day1';
        newDayNumber = 1;
        break;
      case 'day1':
        newPhase = 'night2plus';
        newNightNumber = 2;
        break;
      case 'night2plus':
        newPhase = 'day2plus';
        newDayNumber = Math.max(2, newDayNumber + 1);
        break;
      case 'day2plus':
        newPhase = 'night2plus';
        newNightNumber += 1;
        break;
      default:
        return state;
    }

    return {
      current_game: {
        ...state.current_game,
        current_phase: newPhase,
        night_number: newNightNumber,
        day_number: newDayNumber,
      }
    };
  }),

  // Reset
  resetGame: () => set({
    current_game: undefined,
    current_player: undefined,
    players: [],
    night_actions: [],
    day_eliminations: [],
    links: [],
    amulets: [],
    game_logs: [],
  }),
}));