import { supabase } from '../config/supabase';
import { GamePlayer } from '../types';
import type { DayResolutionResult, ResolutionDeath, ResolutionLinkDeath } from '../types/resolution';
import { GameService } from './gameService';
import { checkWinConditions, processLinkDeaths } from '../utils/gameLogic';

function playerName(players: GamePlayer[], id: string) {
  return players.find(p => p.id === id)?.username || 'Unknown';
}

function toLinkDeaths(players: GamePlayer[], links: any[], eliminatedId: string, linkDeathIds: string[]): ResolutionLinkDeath[] {
  return linkDeathIds.map(pid => {
    const link = links.find((l: any) => l.is_active && (l.player1_id === pid || l.player2_id === pid));
    const linkedToPlayerId = link ? (link.player1_id === pid ? (link.player2_id || eliminatedId) : link.player1_id) : eliminatedId;
    return {
      playerId: pid,
      playerName: playerName(players, pid),
      linkedToPlayerId,
      linkType: (link?.link_type || 'cupid') as any,
    };
  });
}

/**
 * Minimal Day resolution:
 * - Applies delayed Soldier death (if present from last night modifiers)
 * - Applies Tragic Hero night kill if the hero died last night and victim is provided
 * - Applies moderator-selected day elimination (and cascading link deaths)
 *
 * Vote tallying is not implemented yet in UI; moderator selection acts as the outcome.
 */
export class DayResolutionService {
  static async resolveDay(
    gameId: string,
    dayNumber: number,
    opts: {
      votedOutPlayerId?: string | null; // moderator selection
      tragicHeroNightVictimId?: string | null; // if a tragic hero died at night
      tragicHeroDayVictimId?: string | null; // if tragic hero voted out (instant)
    } = {}
  ): Promise<DayResolutionResult> {
    const players = await GameService.getGamePlayers(gameId);
    const links = await GameService.getGameLinks(gameId).catch(() => []);
    const amulets = await GameService.getGameAmulets(gameId).catch(() => []);

    const lastNight = await GameService.getLatestNightResolution(gameId);
    const silencedPlayers = lastNight?.silencedPlayers || [];

    const nightDeaths: ResolutionDeath[] = (lastNight?.deaths || []).map(d => ({
      playerId: d.playerId,
      playerName: d.playerName,
      cause: d.cause,
      sourcePlayerId: d.sourcePlayerId,
    }));

    // Apply delayed Soldier death at day start (PRD-style). This is a forced death before vote.
    const soldierId = lastNight?.nextPhaseModifiers?.soldierDiesAtDay;
    if (soldierId) {
      const soldier = players.find(p => p.id === soldierId);
      if (soldier?.is_alive) {
        await GameService.updateGamePlayer(soldierId, {
          is_alive: false,
          eliminated_by: 'day',
          eliminated_at: new Date().toISOString(),
        } as any);
        nightDeaths.push({
          playerId: soldierId,
          playerName: soldier.username,
          cause: 'alien_kill',
        });
      }
    }

    // Tragic hero night kill (if hero died last night)
    let tragicHeroNightKill: DayResolutionResult['tragicHeroNightKill'] | undefined;
    const tragicHeroDiedAtNight = (lastNight?.deaths || []).some(d => {
      const p = players.find(pp => pp.id === d.playerId);
      return p?.role === 'tragic_hero';
    });
    if (tragicHeroDiedAtNight && opts.tragicHeroNightVictimId) {
      const hero = players.find(pp => pp.role === 'tragic_hero' && !(pp as any).is_alive) || null;
      const victimId = opts.tragicHeroNightVictimId;
      const victim = players.find(p => p.id === victimId);
      if (hero && victim && victim.is_alive) {
        await GameService.updateGamePlayer(victimId, {
          is_alive: false,
          eliminated_by: 'day',
          eliminated_at: new Date().toISOString(),
        } as any);

        await supabase.from('tragic_hero_kills').insert({
          game_id: gameId,
          tragic_hero_id: hero.id,
          victim_id: victimId,
          killed_at_phase: 'night',
        });

        tragicHeroNightKill = {
          heroId: hero.id,
          heroName: hero.username,
          victimId,
          victimName: victim.username,
        };
      }
    }

    // Day elimination (moderator selection)
    const protectedPlayers: string[] = [];
    const linkDeaths: ResolutionLinkDeath[] = [];
    let votedOutPlayer: DayResolutionResult['votedOutPlayer'] | undefined;
    let tragicHeroDayKill: DayResolutionResult['tragicHeroDayKill'] | undefined;

    const votedOutId = opts.votedOutPlayerId || null;
    if (dayNumber >= 2 && !votedOutId) {
      // PRD: Day 2+ elimination is mandatory
      throw new Error('Elimination is mandatory on Day 2+');
    }
    if (votedOutId) {
      const target = players.find(p => p.id === votedOutId);
      if (target && target.is_alive) {
        // VIP is immune to day vote elimination (but not link deaths).
        if (target.role === 'vip_passenger') {
          protectedPlayers.push(votedOutId);
        } else {
          // Shielding device blocks direct elimination (but not link deaths). Track B will manage lifecycle; we just enforce.
          const hasShield = amulets.some(
            a => a.amulet_type === 'shielding_device' && a.current_holder_id === votedOutId && !a.is_used
          );
          if (hasShield) {
            protectedPlayers.push(votedOutId);
          } else {
            await GameService.updateGamePlayer(votedOutId, {
              is_alive: false,
              eliminated_by: 'day',
              eliminated_at: new Date().toISOString(),
            } as any);
            await GameService.recordDayElimination(gameId, dayNumber, votedOutId);

            votedOutPlayer = {
              playerId: votedOutId,
              playerName: target.username,
              voteCount: 0,
              totalVotes: 0,
            };

            // Tragic hero day kill (instant)
            if (target.role === 'tragic_hero' && opts.tragicHeroDayVictimId) {
              const victimId = opts.tragicHeroDayVictimId;
              const victim = players.find(p => p.id === victimId);
              if (victim && victim.is_alive) {
                await GameService.updateGamePlayer(victimId, {
                  is_alive: false,
                  eliminated_by: 'day',
                  eliminated_at: new Date().toISOString(),
                } as any);
                await supabase.from('tragic_hero_kills').insert({
                  game_id: gameId,
                  tragic_hero_id: votedOutId,
                  victim_id: victimId,
                  killed_at_phase: 'day',
                });
                tragicHeroDayKill = {
                  heroId: votedOutId,
                  heroName: target.username,
                  victimId,
                  victimName: victim.username,
                };
              }
            }

            // Link deaths from day elimination (PRD: shield does NOT block link deaths)
            const cascades = processLinkDeaths(votedOutId, links as any, players);
            for (const pid of cascades) {
              const p = players.find(pp => pp.id === pid);
              if (p && p.is_alive) {
                await GameService.updateGamePlayer(pid, {
                  is_alive: false,
                  eliminated_by: 'day',
                  eliminated_at: new Date().toISOString(),
                } as any);
              }
            }
            linkDeaths.push(...toLinkDeaths(players, links as any, votedOutId, cascades));
          }
        }
      }
    }

    const refreshedPlayers = await GameService.getGamePlayers(gameId);
    const winCondition = checkWinConditions(refreshedPlayers, links as any);

    const result: DayResolutionResult = {
      phase: 'day',
      dayNumber,
      nightDeaths,
      tragicHeroNightKill,
      votedOutPlayer,
      tragicHeroDayKill,
      linkDeaths,
      protectedPlayers,
      silencedPlayers,
      winCondition,
    };

    await GameService.logGameEvent(gameId, 'day_resolution', result as any);

    return result;
  }
}


