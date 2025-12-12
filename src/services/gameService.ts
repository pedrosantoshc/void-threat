import { supabase } from '../config/supabase';
import { GameSession, GamePlayer, AppUser } from '../types';

export class GameService {
  /**
   * Create a new game session in Supabase
   */
  static async createGameSession(gameData: Omit<GameSession, 'id'>): Promise<GameSession> {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert(gameData)
        .select()
        .single();

      if (error) {
        console.error('Error creating game session:', error);
        // Common when DB doesn't yet have the `game_url` column
        if (typeof error.message === 'string' && error.message.toLowerCase().includes('game_url')) {
          throw new Error(
            'Database is missing the `game_url` column on game_sessions. Add it in Supabase (ALTER TABLE game_sessions ADD COLUMN game_url text) and retry.'
          );
        }
        throw new Error(`Failed to create game: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Game creation error:', error);
      throw error;
    }
  }

  /**
   * Get game session by ID or game code
   */
  static async getGameSession(identifier: string): Promise<GameSession | null> {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .or(`id.eq.${identifier},game_code.eq.${identifier}`)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching game session:', error);
        throw new Error(`Failed to fetch game: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Game fetch error:', error);
      return null;
    }
  }

  /**
   * Update game session
   */
  static async updateGameSession(
    gameId: string, 
    updates: Partial<GameSession>
  ): Promise<GameSession> {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .update(updates)
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game session:', error);
        throw new Error(`Failed to update game: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Game update error:', error);
      throw error;
    }
  }

  /**
   * Join a game as a player
   */
  static async joinGame(
    gameCode: string, 
    user: AppUser
  ): Promise<{ game: GameSession; player: GamePlayer }> {
    try {
      // First, get the game
      const game = await this.getGameSession(gameCode);
      if (!game) {
        throw new Error('Game not found');
      }

      if (game.status !== 'setup') {
        throw new Error('Game is no longer accepting players');
      }

      // Check if user is already in the game
      const existingPlayer = await this.getPlayerInGame(game.id, user.id);
      if (existingPlayer) {
        return { game, player: existingPlayer };
      }

      // Get current player count
      const currentPlayers = await this.getGamePlayers(game.id);
      
      const maxPlayers = (game as any).max_players ?? 15;
      if (currentPlayers.length >= maxPlayers) {
        throw new Error(`Game is full (maximum ${maxPlayers} players)`);
      }

      // Create new player
      const newPlayer: Omit<GamePlayer, 'id'> = {
        game_id: game.id,
        user_id: user.is_guest ? undefined : user.id,
        username: user.username,
        role: 'crew_member', // Default, will be assigned later
        team: 'crew',
        is_alive: true,
        eliminated_by: null,
        position_order: currentPlayers.length + 1,
      };

      const { data: player, error } = await supabase
        .from('game_players')
        .insert(newPlayer)
        .select()
        .single();

      if (error) {
        console.error('Error creating player:', error);
        throw new Error(`Failed to join game: ${error.message}`);
      }

      // Update game player count
      await this.updateGameSession(game.id, {
        player_count: currentPlayers.length + 1
      });

      return { 
        game: { ...game, player_count: currentPlayers.length + 1 }, 
        player 
      };
    } catch (error) {
      console.error('Join game error:', error);
      throw error;
    }
  }

  /**
   * Get all players in a game
   */
  static async getGamePlayers(gameId: string): Promise<GamePlayer[]> {
    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('position_order');

      if (error) {
        console.error('Error fetching game players:', error);
        throw new Error(`Failed to fetch players: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get players error:', error);
      return [];
    }
  }

  /**
   * Get a specific player in a game
   */
  static async getPlayerInGame(gameId: string, userId?: string): Promise<GamePlayer | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Get player error:', error);
      return null;
    }
  }

  /**
   * Assign roles to all players in a game
   */
  static async assignRolesToPlayers(
    gameId: string, 
    playerRoleAssignments: Array<{ playerId: string; role: string; team: string }>
  ): Promise<GamePlayer[]> {
    try {
      const updatePromises = playerRoleAssignments.map(assignment => 
        supabase
          .from('game_players')
          .update({ 
            role: assignment.role, 
            team: assignment.team 
          })
          .eq('id', assignment.playerId)
          .select()
          .single()
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Role assignment errors:', errors);
        throw new Error('Failed to assign some roles');
      }

      return results.map(result => result.data).filter(Boolean);
    } catch (error) {
      console.error('Role assignment error:', error);
      throw error;
    }
  }

  /**
   * Start a game (change status from setup to playing)
   */
  static async startGame(gameId: string): Promise<GameSession> {
    try {
      const updates: Partial<GameSession> = {
        status: 'playing',
        current_phase: 'night1',
        started_at: new Date().toISOString(),
      };

      return await this.updateGameSession(gameId, updates);
    } catch (error) {
      console.error('Start game error:', error);
      throw error;
    }
  }

  /**
   * Leave a game
   */
  static async leaveGame(gameId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error leaving game:', error);
        return false;
      }

      // Update player count
      const remainingPlayers = await this.getGamePlayers(gameId);
      await this.updateGameSession(gameId, {
        player_count: remainingPlayers.length
      });

      return true;
    } catch (error) {
      console.error('Leave game error:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time game updates
   */
  static subscribeToGameUpdates(
    gameId: string, 
    onGameUpdate: (game: GameSession) => void,
    onPlayersUpdate: (players: GamePlayer[]) => void
  ) {
    // Subscribe to game session changes
    const gameSubscription = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Game update:', payload);
          if (payload.new) {
            onGameUpdate(payload.new as GameSession);
          }
        }
      )
      .subscribe();

    // Subscribe to players changes
    const playersSubscription = supabase
      .channel(`players_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        async () => {
          console.log('Players update');
          // Refetch all players when there's a change
          const players = await this.getGamePlayers(gameId);
          onPlayersUpdate(players);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      gameSubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  }

  /**
   * Check if a game code is available
   */
  static async isGameCodeAvailable(gameCode: string): Promise<boolean> {
    try {
      const game = await this.getGameSession(gameCode);
      return !game;
    } catch (error) {
      return false;
    }
  }
}