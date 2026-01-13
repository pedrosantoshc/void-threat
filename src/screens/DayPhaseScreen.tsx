import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, Chip, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer, Amulet } from '../types';
import { darkTheme, spacing, appColors } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';
import { processDayElimination, checkWinConditions } from '../utils/gameLogic';
import type { NightResolutionResult } from '../types/resolution';
import { AmuletService } from '../services/amuletService';
import { ROLES } from '../constants/roles';
import { supabase } from '../config/supabase';

type DayPhaseScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'DayPhase'>;
  route: RouteProp<NavigationStackParamList, 'DayPhase'>;
};

const DayPhaseScreen: React.FC<DayPhaseScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id, day_number } = route.params;
  const { current_game, players, links, setPlayers, setCurrentGame, currentUser } = useGameStore();
  
  const [discussionTimeLeft, setDiscussionTimeLeft] = useState(300); // 5 minutes default
  const [isDiscussionActive, setIsDiscussionActive] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<GamePlayer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastNight, setLastNight] = useState<NightResolutionResult | null>(null);
  const [tragicHeroNightVictimId, setTragicHeroNightVictimId] = useState<string | null>(null);
  const [pendingVoteTarget, setPendingVoteTarget] = useState<GamePlayer | null>(null);
  const [tragicHeroDayVictimId, setTragicHeroDayVictimId] = useState<string | null>(null);
  const [amulets, setAmulets] = useState<Amulet[]>([]);
  const [pendingAmuletAssignments, setPendingAmuletAssignments] = useState<Amulet[]>([]);
  const [triggeredAmulets, setTriggeredAmulets] = useState<Amulet[]>([]);
  const [shipDoctorProtectedId, setShipDoctorProtectedId] = useState<string | undefined>(undefined);

  const alivePlayers = players.filter(p => p.is_alive);
  const canModerate = !!current_game && !!currentUser && !currentUser.is_guest && current_game.host_id === currentUser.id;

  // Ensure we have fresh session/players and stay synced in realtime
  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    (async () => {
      const fetched = await GameService.getGameSession(game_id);
      if (fetched) setCurrentGame(fetched);
      const currentPlayers = await GameService.getGamePlayers(game_id);
      setPlayers(currentPlayers);
      const ln = await GameService.getLatestNightResolution(game_id);
      setLastNight(ln);
      const a = await GameService.getGameAmulets(game_id).catch(() => []);
      setAmulets(a);

      // Handle Day 1 early-game amulet assignment
      if (day_number === 1) {
        await handleDay1AmuletAssignment(a, currentPlayers);
      }

      // Fetch Ship Doctor protection from the previous night (applies to today's elimination)
      if (day_number > 1 && fetched?.night_number) {
        const protectedId = await fetchShipDoctorProtectedId({
          gameId: game_id,
          nightNumber: fetched.night_number,
        });
        setShipDoctorProtectedId(protectedId);
      } else {
        setShipDoctorProtectedId(undefined);
      }

      // Handle daily auto-pass for Shielding Device / Resonance Tracker
      if (day_number > 1) {
        await AmuletService.autoPassDailyAmulets(game_id);
        const refreshedAmulets = await GameService.getGameAmulets(game_id).catch(() => []);
        setAmulets(refreshedAmulets);
        // Check for newly assigned amulets that need holder notification
        const newlyAssigned = refreshedAmulets.filter(
          (ra) =>
            ra.current_holder_id &&
            !ra.is_used &&
            (ra.amulet_type === 'shielding_device' || ra.amulet_type === 'resonance_tracker')
        );
        if (newlyAssigned.length > 0) {
          setPendingAmuletAssignments(newlyAssigned);
        }
      }

      unsubscribe = GameService.subscribeToGameUpdates(
        game_id,
        (g) => setCurrentGame(g),
        (p) => setPlayers(p)
      );
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [game_id]);

  const fetchShipDoctorProtectedId = async (params: {
    gameId: string;
    nightNumber: number;
  }): Promise<string | undefined> => {
    const { gameId, nightNumber } = params;
    try {
      const { data, error } = await supabase
        .from('night_actions')
        .select('target_id, created_at')
        .eq('game_id', gameId)
        .eq('night_number', nightNumber)
        .eq('role', 'ship_doctor')
        .eq('action_type', 'protect')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return undefined;
      return (data as any)?.target_id ?? undefined;
    } catch {
      return undefined;
    }
  };

  // Handle Day 1 amulet assignment
  const handleDay1AmuletAssignment = async (gameAmulets: Amulet[], gamePlayers: GamePlayer[]) => {
    const earlyGameAmulets = gameAmulets.filter(
      (a) =>
        (a.amulet_type === 'shielding_device' || a.amulet_type === 'resonance_tracker') &&
        !a.is_used &&
        !a.current_holder_id // Not yet assigned
    );

    if (earlyGameAmulets.length === 0) return;

    const assigned: Amulet[] = [];
    for (const amulet of earlyGameAmulets) {
      const updatedAmulet = await AmuletService.assignAmuletRandomly(amulet.id, game_id);
      if (updatedAmulet) {
        assigned.push(updatedAmulet);
      }
    }

    if (assigned.length > 0) {
      setPendingAmuletAssignments(assigned);
      // Refresh amulets state
      const refreshedAmulets = await GameService.getGameAmulets(game_id).catch(() => []);
      setAmulets(refreshedAmulets);
    }
  };

  // Handle mid-game amulet triggers after elimination
  const handleAmuletTriggers = async () => {
    const eliminationCount = AmuletService.getEliminationCount(players);
    const triggered = await AmuletService.advanceAmuletTriggers({
      gameId: game_id,
      eliminationCount,
    });

    if (triggered.length > 0) {
      // Assign triggered amulets randomly
      const assigned: Amulet[] = [];
      for (const amulet of triggered) {
        const updatedAmulet = await AmuletService.assignAmuletRandomly(amulet.id, game_id);
        if (updatedAmulet) {
          assigned.push(updatedAmulet);
        }
      }

      if (assigned.length > 0) {
        setTriggeredAmulets(assigned);
        // Refresh amulets state
        const refreshedAmulets = await GameService.getGameAmulets(game_id).catch(() => []);
        setAmulets(refreshedAmulets);
      }
    }
  };

  // Navigate holder to amulet screen
  const handleAmuletNotification = (amulet: Amulet) => {
    navigation.navigate('AmuletReceived', {
      amulet_id: amulet.id,
      game_id: game_id,
    });
  };

  // Get holder name for an amulet
  const getAmuletHolderName = (amulet: Amulet): string => {
    if (!amulet.current_holder_id) return 'Unknown';
    const holder = players.find((p) => p.id === amulet.current_holder_id);
    return holder?.username || 'Unknown';
  };

  // Get amulet display name
  const getAmuletDisplayName = (amuletType: string): string => {
    const names: Record<string, string> = {
      shielding_device: 'Shielding Device',
      resonance_tracker: 'Resonance Tracker',
      neural_implant: 'Neural Implant',
      bio_scanner: 'Bio Scanner',
      echo_beacon: 'Echo Beacon',
    };
    return names[amuletType] || amuletType;
  };

  const resonanceReminder = React.useMemo(() => {
    // Non-blocking reminder only.
    // If any current holder is the Resonance Tracker holder, remind moderator.
    const holders = amulets.filter(a => a.amulet_type === 'resonance_tracker' && !a.is_used && a.current_holder_id);
    if (holders.length === 0) return null;
    const holderIds = holders.map(h => h.current_holder_id!).filter(Boolean);
    const names = players.filter(p => holderIds.includes(p.id)).map(p => p.username);
    if (names.length === 0) return 'Resonance Tracker holder cannot vote today.';
    return `Resonance Tracker: ${names.join(', ')} cannot vote today.`;
  }, [amulets, players]);

  // Neural Implant reveal - if holder survived and selected a target, reveal target's role today
  const neuralImplantReveal = React.useMemo(() => {
    // Only reveal on Day 2+ (Neural Implant is used on Day before, reveal happens next day)
    if (day_number < 2) return null;

    const neuralImplant = amulets.find(
      (a) =>
        a.amulet_type === 'neural_implant' &&
        a.neural_target_id &&
        a.neural_holder_id &&
        !a.is_used
    );

    if (!neuralImplant) return null;

    const role = AmuletService.checkNeuralImplantReveal({
      amulet: neuralImplant,
      players,
    });

    if (!role) return null;

    const holder = players.find((p) => p.id === neuralImplant.neural_holder_id);
    const target = players.find((p) => p.id === neuralImplant.neural_target_id);
    const roleData = ROLES[role];

    return {
      holderName: holder?.username || 'Unknown',
      targetName: target?.username || 'Unknown',
      targetRole: roleData?.name || role,
      targetTeam: roleData?.team || 'unknown',
      targetDescription: roleData?.description || '',
      amuletId: neuralImplant.id,
    };
  }, [amulets, players, day_number]);

  // Discussion timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isDiscussionActive && discussionTimeLeft > 0) {
      interval = setInterval(() => {
        setDiscussionTimeLeft(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDiscussionActive, discussionTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startDiscussion = () => {
    setIsDiscussionActive(true);
  };

  const endDiscussion = () => {
    setIsDiscussionActive(false);
    Alert.alert(
      'Discussion Ended',
      'Time for voting! Players should now vote to eliminate someone or skip.',
      [
        {
          text: 'Start Voting',
          onPress: () => {
            // TODO: Open voting interface
            console.log('Starting voting phase');
          }
        }
      ]
    );
  };

  const handleSkipVoting = () => {
    if (day_number >= 2) {
      Alert.alert('Elimination required', 'Day 2+ requires an elimination.');
      return;
    }
    Alert.alert(
      'Skip Elimination?',
      'No one will be eliminated today. Proceed directly to night phase?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip Vote',
          onPress: proceedToNight
        }
      ]
    );
  };

  const handleElimination = (player: GamePlayer) => {
    Alert.alert(
      'Eliminate Player?',
      `Eliminate ${player.username}? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Eliminate',
          style: 'destructive',
          onPress: () => eliminatePlayer(player)
        }
      ]
    );
  };

  const eliminatePlayer = async (player: GamePlayer) => {
    try {
      setIsProcessing(true);

      if (!canModerate) return;

      // If the voted-out player is Tragic Hero, we need an immediate victim choice.
      if (player.role === 'tragic_hero') {
        setPendingVoteTarget(player);
        setIsProcessing(false);
        return;
      }

      if (current_game) {
        const [freshPlayers, freshLinks, freshAmulets] = await Promise.all([
          GameService.getGamePlayers(current_game.id),
          GameService.getGameLinks(current_game.id),
          GameService.getGameAmulets(current_game.id),
        ]);

        const dayResult = await processDayElimination(
          current_game.id,
          day_number,
          player.id,
          freshPlayers,
          freshLinks,
          freshAmulets,
          lastNight?.silencedPlayers || [],
          shipDoctorProtectedId,
          tragicHeroNightVictimId && lastNight
            ? { heroId: lastNight.deaths.find(d => freshPlayers.find(p => p.id === d.playerId)?.role === 'tragic_hero')?.playerId || '', victimId: tragicHeroNightVictimId }
            : undefined
        );

        const refreshedPlayers = await GameService.getGamePlayers(current_game.id);
        setPlayers(refreshedPlayers);

        if (dayResult.winCondition) {
          await GameService.endGame(current_game.id, dayResult.winCondition);
          navigation.navigate('GameEnd', { game_id: current_game.id });
          return;
        }

        // Check for mid-game amulet triggers after elimination
        await handleAmuletTriggers();
      }

      setEliminatedPlayer(player);
      setTimeout(() => proceedToNight(), 1200);
      
    } catch (error) {
      console.error('Error eliminating player:', error);
      Alert.alert('Error', String((error as any)?.message || 'Failed to process day'));
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToNight = async () => {
    try {
      setIsProcessing(true);
      
      // Check win conditions first
      if (current_game) {
        const refreshedPlayers = await GameService.getGamePlayers(current_game.id);
        setPlayers(refreshedPlayers);
        const winner = checkWinConditions(refreshedPlayers, links || []);
        if (winner) {
          await GameService.endGame(current_game.id, winner);
          navigation.navigate('GameEnd', { game_id: current_game.id });
          return;
        }
      }
      
      // If we haven't resolved a day action yet (e.g. Day 1 skip), resolve it now
      if (current_game && day_number === 1 && !eliminatedPlayer) {
        const [freshPlayers, freshLinks, freshAmulets] = await Promise.all([
          GameService.getGamePlayers(current_game.id),
          GameService.getGameLinks(current_game.id),
          GameService.getGameAmulets(current_game.id),
        ]);
        await processDayElimination(
          current_game.id,
          day_number,
          null, // no elimination (Day 1 can skip)
          freshPlayers,
          freshLinks,
          freshAmulets,
          lastNight?.silencedPlayers || [],
          shipDoctorProtectedId,
          undefined
        );
        const refreshedPlayers = await GameService.getGamePlayers(current_game.id);
        setPlayers(refreshedPlayers);
      }

      // Advance to next night phase
      if (current_game) {
        const nextNightNumber = current_game.night_number + 1;
        
        await GameService.updateGameSession(current_game.id, {
          current_phase: 'night2plus',
          night_number: nextNightNumber,
        });

        navigation.navigate('NightPhase', {
          game_id: game_id,
          night_number: nextNightNumber,
        });
      }
      
    } catch (error) {
      console.error('Error proceeding to night:', error);
      Alert.alert('Error', 'Failed to proceed to night phase');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!current_game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Game Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Day {day_number}
          </Text>
          <Text style={styles.subtitle}>
            Discussion and Voting Phase
          </Text>
        </View>

        {/* Night Results (if any) */}
        {eliminatedPlayer && (
          <Card style={styles.alertCard}>
            <Card.Content>
              <Text style={styles.alertTitle}>💀 Elimination Result</Text>
              <Text style={styles.alertText}>
                {eliminatedPlayer.username} has been eliminated by vote.
              </Text>
            </Card.Content>
          </Card>
        )}

        {resonanceReminder && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Reminder</Text>
              <Text style={styles.subtitle}>{resonanceReminder}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Amulet Assignments - Day 1 or Daily Pass */}
        {canModerate && pendingAmuletAssignments.length > 0 && (
          <Card style={styles.amuletCard}>
            <Card.Content>
              <Text style={styles.amuletCardTitle}>Amulet Assignments</Text>
              <Text style={styles.amuletCardText}>
                {day_number === 1
                  ? 'The following amulets have been randomly assigned. Inform the holders.'
                  : 'Daily amulet pass complete. The following players received amulets.'}
              </Text>
              {pendingAmuletAssignments.map((amulet) => (
                <View key={amulet.id} style={styles.amuletAssignmentRow}>
                  <View style={styles.amuletInfo}>
                    <Text style={styles.amuletName}>
                      {getAmuletDisplayName(amulet.amulet_type)}
                    </Text>
                    <Text style={styles.amuletHolder}>
                      Holder: {getAmuletHolderName(amulet)}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => handleAmuletNotification(amulet)}
                    style={styles.amuletButton}
                  >
                    Notify
                  </Button>
                </View>
              ))}
              <Button
                mode="text"
                onPress={() => setPendingAmuletAssignments([])}
                style={styles.dismissButton}
              >
                Dismiss
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Mid-Game Triggered Amulets */}
        {canModerate && triggeredAmulets.length > 0 && (
          <Card style={styles.triggeredCard}>
            <Card.Content>
              <Text style={styles.triggeredCardTitle}>Amulets Triggered!</Text>
              <Text style={styles.triggeredCardText}>
                New amulets have been activated due to elimination count.
              </Text>
              {triggeredAmulets.map((amulet) => (
                <View key={amulet.id} style={styles.amuletAssignmentRow}>
                  <View style={styles.amuletInfo}>
                    <Text style={styles.amuletName}>
                      {getAmuletDisplayName(amulet.amulet_type)}
                    </Text>
                    <Text style={styles.amuletHolder}>
                      Holder: {getAmuletHolderName(amulet)}
                    </Text>
                    <Text style={styles.amuletTrigger}>
                      Triggered at {amulet.trigger_elimination_count} eliminations
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => handleAmuletNotification(amulet)}
                    style={styles.amuletButton}
                  >
                    Notify
                  </Button>
                </View>
              ))}
              <Button
                mode="text"
                onPress={() => setTriggeredAmulets([])}
                style={styles.dismissButton}
              >
                Dismiss
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Neural Implant Reveal - moderator shows holder the result */}
        {canModerate && neuralImplantReveal && (
          <Card style={styles.neuralRevealCard}>
            <Card.Content>
              <View style={styles.neuralHeader}>
                <Text style={styles.neuralIcon}>🧠</Text>
                <Text style={styles.neuralTitle}>Neural Implant Reveal</Text>
              </View>
              <Text style={styles.neuralHolderText}>
                Holder: {neuralImplantReveal.holderName}
              </Text>
              <Text style={styles.neuralInstructions}>
                The Neural Implant holder survived and can now learn their target's role.
              </Text>
              <View style={styles.neuralResultBox}>
                <Text style={styles.neuralTargetLabel}>Target: {neuralImplantReveal.targetName}</Text>
                <View style={styles.neuralRoleContainer}>
                  <Text style={styles.neuralRoleLabel}>Role:</Text>
                  <Text style={styles.neuralRoleName}>{neuralImplantReveal.targetRole}</Text>
                </View>
                <View style={styles.neuralTeamBadge}>
                  <Text style={[
                    styles.neuralTeamText,
                    neuralImplantReveal.targetTeam === 'alien' && styles.alienTeam,
                    neuralImplantReveal.targetTeam === 'crew' && styles.crewTeam,
                  ]}>
                    {neuralImplantReveal.targetTeam.toUpperCase()}
                  </Text>
                </View>
                {neuralImplantReveal.targetDescription && (
                  <Text style={styles.neuralDescription}>
                    {neuralImplantReveal.targetDescription}
                  </Text>
                )}
              </View>
              <Text style={styles.neuralReminder}>
                Inform {neuralImplantReveal.holderName} of this information privately.
              </Text>
              <Button
                mode="contained"
                onPress={async () => {
                  await AmuletService.updateAmulet(neuralImplantReveal.amuletId, { is_used: true });
                  const refreshed = await GameService.getGameAmulets(game_id).catch(() => []);
                  setAmulets(refreshed);
                }}
                style={styles.neuralDismissButton}
              >
                Mark as Revealed
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Tragic Hero night-kill prompt (if Tragic Hero died last night) */}
        {canModerate &&
          lastNight &&
          lastNight.deaths.some(d => players.find(p => p.id === d.playerId)?.role === 'tragic_hero') &&
          !tragicHeroNightVictimId && (
            <Card style={styles.alertCard}>
              <Card.Content>
                <Text style={styles.alertTitle}>Tragic Hero</Text>
                <Text style={styles.alertText}>
                  A Tragic Hero died last night. Select the victim they choose before proceeding.
                </Text>
                {alivePlayers.map(p => (
                  <Button
                    key={p.id}
                    mode="outlined"
                    onPress={() => setTragicHeroNightVictimId(p.id)}
                    style={{ marginTop: spacing.xs }}
                  >
                    {p.username}
                  </Button>
                ))}
              </Card.Content>
            </Card>
          )}

        {/* Tragic Hero day-kill prompt (if Tragic Hero voted out) */}
        {canModerate && pendingVoteTarget && (
          <Card style={styles.alertCard}>
            <Card.Content>
              <Text style={styles.alertTitle}>Tragic Hero</Text>
              <Text style={styles.alertText}>
                {pendingVoteTarget.username} was voted out and kills instantly. Choose the victim.
              </Text>
              {alivePlayers
                .filter(p => p.id !== pendingVoteTarget.id)
                .map(p => (
                  <Button
                    key={p.id}
                    mode={tragicHeroDayVictimId === p.id ? 'contained' : 'outlined'}
                    onPress={() => setTragicHeroDayVictimId(p.id)}
                    style={{ marginTop: spacing.xs }}
                  >
                    {p.username}
                  </Button>
                ))}
              <Button
                mode="contained"
                disabled={!tragicHeroDayVictimId || !current_game}
                onPress={async () => {
                  if (!current_game || !pendingVoteTarget || !tragicHeroDayVictimId) return;
                  setIsProcessing(true);
                  try {
                    const [freshPlayers, freshLinks, freshAmulets] = await Promise.all([
                      GameService.getGamePlayers(current_game.id),
                      GameService.getGameLinks(current_game.id),
                      GameService.getGameAmulets(current_game.id),
                    ]);
                    await processDayElimination(
                      current_game.id,
                      day_number,
                      pendingVoteTarget.id,
                      freshPlayers,
                      freshLinks,
                      freshAmulets,
                      lastNight?.silencedPlayers || [],
                      shipDoctorProtectedId,
                      tragicHeroNightVictimId && lastNight
                        ? { heroId: lastNight.deaths.find(d => freshPlayers.find(p => p.id === d.playerId)?.role === 'tragic_hero')?.playerId || '', victimId: tragicHeroNightVictimId }
                        : undefined,
                      tragicHeroDayVictimId
                    );
                    const refreshed = await GameService.getGamePlayers(current_game.id);
                    setPlayers(refreshed);
                    setEliminatedPlayer(pendingVoteTarget);
                    setPendingVoteTarget(null);
                    setTragicHeroDayVictimId(null);
                    setTimeout(() => proceedToNight(), 1200);
                  } catch (e) {
                    Alert.alert('Error', String((e as any)?.message || e));
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                style={{ marginTop: spacing.sm }}
              >
                Confirm Tragic Hero Kill
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Discussion Timer */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.timerHeader}>
              <Text style={styles.timerTitle}>Discussion Timer</Text>
              <Text style={[styles.timerDisplay, { 
                color: discussionTimeLeft < 60 ? darkTheme.colors.error : darkTheme.colors.primary 
              }]}>
                {formatTime(discussionTimeLeft)}
              </Text>
            </View>
            
            <ProgressBar 
              progress={isDiscussionActive ? (300 - discussionTimeLeft) / 300 : 0}
              color={discussionTimeLeft < 60 ? darkTheme.colors.error : darkTheme.colors.primary}
              style={styles.timerProgress}
            />

            <View style={styles.timerControls}>
              {!isDiscussionActive ? (
                <Button
                  mode="contained"
                  onPress={startDiscussion}
                  style={styles.timerButton}
                  labelStyle={styles.timerButtonText}
                >
                  START DISCUSSION
                </Button>
              ) : (
                <>
                  <Button
                    mode="outlined"
                    onPress={() => setIsDiscussionActive(false)}
                    style={styles.timerButton}
                  >
                    Pause
                  </Button>
                  <Button
                    mode="contained"
                    onPress={endDiscussion}
                    style={styles.timerButton}
                    labelStyle={styles.timerButtonText}
                  >
                    END DISCUSSION
                  </Button>
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Alive Players */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Alive Players ({alivePlayers.length})</Text>
            {alivePlayers.map((player) => (
              <List.Item
                key={player.id}
                title={player.username}
                description={`Position ${player.position_order}`}
                left={() => (
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerInitial}>
                      {player.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                right={() => (
                  <Button
                    mode="outlined"
                    onPress={() => handleElimination(player)}
                    disabled={isProcessing || !canModerate}
                    style={styles.eliminateButton}
                    labelStyle={styles.eliminateButtonText}
                  >
                    Eliminate
                  </Button>
                )}
                style={styles.playerItem}
              />
            ))}
          </Card.Content>
        </Card>

        {/* Voting Instructions */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Text style={styles.instructionsTitle}>📋 Day Phase Instructions</Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>
                1. <Text style={styles.bold}>Discussion:</Text> Players openly discuss who they suspect
              </Text>
              <Text style={styles.instructionItem}>
                2. <Text style={styles.bold}>Accusations:</Text> Players can accuse others and share information
              </Text>
              <Text style={styles.instructionItem}>
                3. <Text style={styles.bold}>Voting:</Text> Majority vote to eliminate a player or skip
              </Text>
              <Text style={styles.instructionItem}>
                4. <Text style={styles.bold}>Elimination:</Text> Selected player is removed from the game
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Game Controls */}
        <View style={styles.controls}>
          <Button
            mode="outlined"
            onPress={handleSkipVoting}
            disabled={isProcessing || !canModerate}
            style={styles.controlButton}
            labelStyle={styles.controlButtonText}
          >
            Skip Voting
          </Button>

          <Button
            mode="contained"
            onPress={proceedToNight}
            disabled={isProcessing || !canModerate}
            loading={isProcessing}
            style={styles.controlButton}
            labelStyle={styles.controlButtonText}
          >
            {isProcessing ? 'Processing...' : 'Proceed to Night →'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  alertCard: {
    backgroundColor: darkTheme.colors.errorContainer,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onErrorContainer,
    marginBottom: spacing.sm,
  },
  alertText: {
    fontSize: 14,
    color: darkTheme.colors.onErrorContainer,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
  },
  timerDisplay: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  timerProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  timerControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timerButton: {
    flex: 1,
    borderRadius: 4,
  },
  timerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerItem: {
    borderRadius: 8,
    marginBottom: spacing.xs,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  playerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.background,
  },
  eliminateButton: {
    borderColor: darkTheme.colors.error,
    borderRadius: 4,
  },
  eliminateButtonText: {
    color: darkTheme.colors.error,
    fontSize: 12,
  },
  instructionsCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  instructionsList: {
    gap: spacing.sm,
  },
  instructionItem: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  controlButton: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Amulet Card Styles
  amuletCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
  },
  amuletCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.sm,
  },
  amuletCardText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  amuletAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  amuletInfo: {
    flex: 1,
  },
  amuletName: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  amuletHolder: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  amuletTrigger: {
    fontSize: 12,
    color: darkTheme.colors.primary,
    fontStyle: 'italic',
  },
  amuletButton: {
    marginLeft: spacing.sm,
    borderColor: darkTheme.colors.primary,
  },
  dismissButton: {
    marginTop: spacing.sm,
  },
  triggeredCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: appColors.warning,
  },
  triggeredCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: appColors.warning,
    marginBottom: spacing.sm,
  },
  triggeredCardText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  // Neural Implant Reveal Styles
  neuralRevealCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9C27B0', // Purple for Neural Implant
  },
  neuralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  neuralIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  neuralTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9C27B0',
  },
  neuralHolderText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  neuralInstructions: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  neuralResultBox: {
    backgroundColor: darkTheme.colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  neuralTargetLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  neuralRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  neuralRoleLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  neuralRoleName: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  neuralTeamBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    backgroundColor: darkTheme.colors.surfaceVariant,
    marginBottom: spacing.sm,
  },
  neuralTeamText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.onSurfaceVariant,
  },
  alienTeam: {
    color: darkTheme.colors.error,
  },
  crewTeam: {
    color: darkTheme.colors.primary,
  },
  neuralDescription: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  neuralReminder: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  neuralDismissButton: {
    backgroundColor: '#9C27B0',
  },
});

export default DayPhaseScreen;