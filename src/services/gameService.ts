import { supabase } from '../config/supabase';
import { GameSession, GamePlayer, AppUser, DayElimination, Link, Amulet, GameLog } from '../types';
import type { DayResolutionResult, NightResolutionResult } from '../types/resolution';
import { MAX_PLAYERS } from '../constants/game';
import { AmuletService } from './amuletService';

export class GameService {
  static async logGameEvent(
    gameId: string,
    eventType: GameLog['event_type'],
    eventData: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase.from('game_logs').insert({
      game_id: gameId,
      event_type: eventType,
      event_data: eventData,
    });
    if (error) throw error;
  }

  static async getLatestNightResolution(gameId: string): Promise<NightResolutionResult | null> {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('game_id', gameId)
      .eq('event_type', 'night_resolution')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data as any).event_data as NightResolutionResult;
  }

  static async getLatestDayResolution(gameId: string): Promise<DayResolutionResult | null> {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('game_id', gameId)
      .eq('event_type', 'day_resolution')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return (data as any).event_data as DayResolutionResult;
  }

  static async getGameHistory(gameId: string): Promise<GameLog[]> {
    const { data, error } = await supabase
      .from('game_logs')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as GameLog[];
  }

  static async getGameLinks(gameId: string): Promise<Link[]> {
    const { data, error } = await supabase.from('links').select('*').eq('game_id', gameId);
    if (error) throw error;
    return (data || []) as Link[];
  }

  static async getGameAmulets(gameId: string): Promise<Amulet[]> {
    const { data, error } = await supabase.from('amulets').select('*').eq('game_id', gameId);
    if (error) throw error;
    return (data || []) as Amulet[];
  }

  /**
   * Get an existing guest player row in a game by guest_id
   */
  static async getGuestPlayerInGame(gameId: string, guestId?: string): Promise<GamePlayer | null> {
    if (!guestId) return null;
    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('guest_id', guestId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching guest player:', error);
        return null;
      }
      return data || null;
    } catch (error) {
      console.error('Get guest player error:', error);
      return null;
    }
  }
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
      const trimmed = (identifier || '').trim();
      // Avoid PostgREST trying to cast non-UUID strings into the `id` (uuid) column filter.
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const query = supabase.from('game_sessions').select('*');
      const { data, error } = uuidRegex.test(trimmed)
        ? await query.eq('id', trimmed).single()
        : await query.eq('game_code', trimmed.toUpperCase()).single();

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
      if (user.is_guest) {
        const existingGuest = await this.getGuestPlayerInGame(game.id, user.guest_id);
        if (existingGuest) {
          return { game, player: existingGuest };
        }
      } else {
        const existingPlayer = await this.getPlayerInGame(game.id, user.id);
        if (existingPlayer) {
          return { game, player: existingPlayer };
        }
      }

      // Get current player count
      const currentPlayers = await this.getGamePlayers(game.id);
      
      const maxPlayers = (game as any).max_players ?? MAX_PLAYERS;
      if (currentPlayers.length >= maxPlayers) {
        throw new Error(`Game is full (maximum ${maxPlayers} players)`);
      }

      // Create new player
      const newPlayer: Omit<GamePlayer, 'id'> = {
        game_id: game.id,
        user_id: user.is_guest ? undefined : user.id,
        guest_id: user.is_guest ? user.guest_id : undefined,
        username: user.username || user.name || 'Player',
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
   * Update a single game player row
   */
  static async updateGamePlayer(playerId: string, updates: Partial<GamePlayer>): Promise<GamePlayer> {
    try {
      const { data, error } = await supabase
        .from('game_players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game player:', error);
        throw new Error(`Failed to update player: ${error.message}`);
      }

      return data as GamePlayer;
    } catch (error) {
      console.error('Update player error:', error);
      throw error;
    }
  }

  /**
   * Record a day elimination event (for history/statistics)
   */
  static async recordDayElimination(gameId: string, dayNumber: number, eliminatedPlayerId: string): Promise<DayElimination> {
    try {
      const payload: Omit<DayElimination, 'id' | 'created_at'> = {
        game_id: gameId,
        day_number: dayNumber,
        eliminated_player_id: eliminatedPlayerId,
        reason: 'vote',
      };

      const { data, error } = await supabase
        .from('day_eliminations')
        .insert(payload as any)
        .select()
        .single();

      if (error) {
        console.error('Error recording day elimination:', error);
        throw new Error(`Failed to record elimination: ${error.message}`);
      }

      return data as DayElimination;
    } catch (error) {
      console.error('Record day elimination error:', error);
      throw error;
    }
  }

  /**
   * End a game session and persist winner
   */
  static async endGame(gameId: string, winner: string): Promise<GameSession> {
    return await this.updateGameSession(gameId, {
      status: 'ended',
      winner,
      ended_at: new Date().toISOString(),
    });
  }

  /**
   * Start a game (change status from setup to playing)
   * Also initializes amulets if the game has custom_amulets configured
   */
  static async startGame(gameId: string): Promise<GameSession> {
    try {
      // Get current game session to check for custom_amulets
      const game = await this.getGameSession(gameId);

      // Initialize amulets if configured
      const customAmulets = (game as any).custom_amulets as Record<string, number> | undefined;
      if (customAmulets && Object.keys(customAmulets).length > 0) {
        await AmuletService.initializeAmulets(gameId, customAmulets);
        // Note: Early-game amulets (Shielding Device, Resonance Tracker) are assigned at
        // the start of Day 1 (after Night 1), not before Night 1.
      }

      const updates: Partial<GameSession> = {
        status: 'playing',
        current_phase: 'night1',
        night_number: 1,
        day_number: 0,
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

  /**
   * Create a link between players (Cupid, Parasyte, Clone)
   */
  static async createGameLink(
    gameId: string,
    linkType: 'cupid' | 'clone' | 'parasyte',
    player1Id: string,
    player2Id?: string
  ): Promise<Link> {
    const { data, error } = await supabase
      .from('links')
      .insert({
        game_id: gameId,
        link_type: linkType,
        player1_id: player1Id,
        player2_id: player2Id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating link:', error);
      throw new Error(`Failed to create link: ${error.message}`);
    }

    return data as Link;
  }

  /**
   * Check if a link already exists for a given type and player
   */
  static async getLinkForPlayer(
    gameId: string,
    linkType: 'cupid' | 'clone' | 'parasyte',
    playerId: string
  ): Promise<Link | null> {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('game_id', gameId)
      .eq('link_type', linkType)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .maybeSingle();

    if (error) {
      console.error('Error fetching link:', error);
      return null;
    }

    return data as Link | null;
  }
}