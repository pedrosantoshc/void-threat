import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, ProgressBar, List, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer, NightAction, Amulet } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';
import { ROLES } from '../constants/roles';
import { NightActionService } from '../services/nightActionService';
import { checkWinConditions } from '../utils/gameLogic';
import EchoBeaconModeratorModal from '../components/EchoBeaconModeratorModal';
import LinkCreationModal from '../components/LinkCreationModal';
import ShipDoctorProtectionModal from '../components/ShipDoctorProtectionModal';
import NightActionModal from '../components/NightActionModal';

type NightPhaseScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'NightPhase'>;
  route: RouteProp<NavigationStackParamList, 'NightPhase'>;
};

interface NightStep {
  id: string;
  title: string;
  description: string;
  roles: string[];
  actionType: 'scan' | 'protect' | 'link' | 'silence' | 'kill' | 'heal' | 'hunt';
  isCompleted: boolean;
  order: number;
}

const NightPhaseScreen: React.FC<NightPhaseScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id, night_number } = route.params;
  const { current_game, players, links, setPlayers, setCurrentGame, currentUser } = useGameStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [nightSteps, setNightSteps] = useState<NightStep[]>([]);
  const [completedActions, setCompletedActions] = useState<NightAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amulets, setAmulets] = useState<Amulet[]>([]);
  const [showEchoBeaconModal, setShowEchoBeaconModal] = useState(false);
  const [activeEchoBeacon, setActiveEchoBeacon] = useState<Amulet | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeLinkType, setActiveLinkType] = useState<'cupid' | 'parasyte' | 'clone' | null>(null);
  const [activeLinkActor, setActiveLinkActor] = useState<GamePlayer | null>(null);
  const [showShipDoctorModal, setShowShipDoctorModal] = useState(false);
  const [activeShipDoctor, setActiveShipDoctor] = useState<GamePlayer | null>(null);
  const [showNightActionModal, setShowNightActionModal] = useState(false);
  const [activeActionPlayer, setActiveActionPlayer] = useState<GamePlayer | null>(null);
  const [gameLinks, setGameLinks] = useState<any[]>([]);

  const canModerate = !!current_game && !!currentUser && !currentUser.is_guest && current_game.host_id === currentUser.id;

  // Fetch links
  useEffect(() => {
    const fetchGameLinks = async () => {
      const fetchedLinks = await GameService.getGameLinks(game_id).catch(() => []);
      setGameLinks(fetchedLinks);
    };
    fetchGameLinks();
  }, [game_id]);

  // Ensure we have fresh session/players and stay synced in realtime
  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    (async () => {
      const fetched = await GameService.getGameSession(game_id);
      if (fetched) setCurrentGame(fetched);
      const currentPlayers = await GameService.getGamePlayers(game_id);
      setPlayers(currentPlayers);
      const gameAmulets = await GameService.getGameAmulets(game_id).catch(() => []);
      setAmulets(gameAmulets);

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

  // Initialize night steps based on game phase and roles present
  useEffect(() => {
    if (!current_game || players.length === 0) return;

    const steps: NightStep[] = [];
    const alivePlayers = players.filter(p => p.is_alive);
    
    if (night_number === 1) {
      // Night 1 - Setup only, no kills or protections
      
      // Step 1: Linking phase
      const linkingRoles = ['cupid', 'clone', 'parasyte_alien'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (linkingRoles.length > 0) {
        steps.push({
          id: 'linking',
          title: 'Linking Phase',
          description: 'Cupid links lovers, Clone selects target, Parasyte links companion',
          roles: linkingRoles,
          actionType: 'link',
          isCompleted: false,
          order: 1,
        });
      }

      // Step 2: Information gathering
      const infoRoles = ['observer', 'bioscanner', 'dna_tracker', 'detective', 'alien_scanner'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (infoRoles.length > 0) {
        steps.push({
          id: 'information',
          title: 'Information Gathering',
          description: 'Scanners and investigators gather intel',
          roles: infoRoles,
          actionType: 'scan',
          isCompleted: false,
          order: 2,
        });
      }

      // Step 3: Aliens meet
      const alienRoles = alivePlayers.filter(p => p.team === 'alien').map(p => p.role);
      if (alienRoles.length > 0) {
        steps.push({
          id: 'aliens_meet',
          title: 'Aliens Awaken',
          description: 'Aliens see each other and plan strategy',
          roles: alienRoles,
          actionType: 'silence', // Silent meeting
          isCompleted: false,
          order: 3,
        });
      }

    } else {
      // Night 2+ - Full night cycle with kills and protections
      
      // Step 1: Protections first (PRD: Watchman protects from night kills)
      const protectionRoles = ['watchman'].filter(role => alivePlayers.some(p => p.role === role));
      
      if (protectionRoles.length > 0) {
        steps.push({
          id: 'protections',
          title: 'Protection Phase',
          description: 'Watchman protects a player from alien kill',
          roles: protectionRoles,
          actionType: 'protect',
          isCompleted: false,
          order: 1,
        });
      }

      // Step 2: Information gathering
      const infoRoles = ['bioscanner', 'dna_tracker', 'detective', 'alien_scanner'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (infoRoles.length > 0) {
        steps.push({
          id: 'information',
          title: 'Information Gathering',
          description: 'Scanners and investigators gather intel',
          roles: infoRoles,
          actionType: 'scan',
          isCompleted: false,
          order: 2,
        });
      }

      // Step 3: Alien kills (any alien-team member participates)
      const killerRoles = ['alien'].filter(role => alivePlayers.some(p => p.team === 'alien'));
      
      if (killerRoles.length > 0) {
        steps.push({
          id: 'alien_kills',
          title: 'Alien Elimination',
          description: 'Aliens choose their target(s)',
          roles: killerRoles,
          actionType: 'kill',
          isCompleted: false,
          order: 3,
        });
      }

      // Step 4: Other night actions
      const otherRoles = ['predator', 'scientist', 'silencer', 'junior_scanner', 'sleep_alien', 'parasyte_alien', 'clone'].filter(
        role => alivePlayers.some(p => p.role === role)
      );
      
      if (otherRoles.length > 0) {
        steps.push({
          id: 'other_actions',
          title: 'Special Actions',
          description: 'Special roles perform their actions',
          roles: otherRoles,
          actionType: 'hunt',
          isCompleted: false,
          order: 4,
        });
      }
    }

    setNightSteps(steps);
  }, [current_game, players, night_number]);

  const getCurrentStepInfo = () => {
    if (currentStep >= nightSteps.length) {
      return null;
    }
    return nightSteps[currentStep];
  };

  const getProgress = () => {
    if (nightSteps.length === 0) return 0;
    return currentStep / nightSteps.length;
  };

  const handleNextStep = () => {
    if (currentStep < nightSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check for active Echo Beacon that needs moderator handling
  const checkForEchoBeacon = (): Amulet | null => {
    // Only on Night 2+ (Echo Beacon triggers at 4 eliminations, which is mid-game)
    if (night_number < 2) return null;

    const echoBeacon = amulets.find(
      (a) => a.amulet_type === 'echo_beacon' && !a.is_used && a.current_holder_id
    );
    return echoBeacon || null;
  };

  const handleEchoBeaconUsed = async () => {
    // Refresh amulets after Echo Beacon is marked as used
    const refreshedAmulets = await GameService.getGameAmulets(game_id).catch(() => []);
    setAmulets(refreshedAmulets);
    setShowEchoBeaconModal(false);
    setActiveEchoBeacon(null);

    // Continue with night completion
    await proceedWithNightCompletion();
  };

  const proceedWithNightCompletion = async () => {
    try {
      if (current_game) {
        // Resolve night (Night 1 produces a resolution log but no deaths per PRD)
        await NightActionService.resolveNightPhase(game_id, night_number, players);

        const refreshedPlayers = await GameService.getGamePlayers(current_game.id);
        setPlayers(refreshedPlayers);

        const winner = checkWinConditions(refreshedPlayers, links || []);
        if (winner) {
          await GameService.endGame(current_game.id, winner);
          navigation.navigate('GameEnd', { game_id: current_game.id });
          return;
        }
      }

      // Advance to day phase
      if (current_game) {
        const nextDayNumber = night_number === 1 ? 1 : Math.max(current_game.day_number + 1, 2);
        await GameService.updateGameSession(current_game.id, {
          current_phase: night_number === 1 ? 'day1' : 'day2plus',
          day_number: nextDayNumber,
        });
      
        // Navigate to day phase using the same day number we persisted
        navigation.navigate('DayPhase', {
          game_id: game_id,
          day_number: nextDayNumber,
        });
        return;
      }

      // Navigate to day phase
      navigation.navigate('DayPhase', {
        game_id: game_id,
        day_number: night_number === 1 ? 1 : (current_game?.day_number || 1) + 1
      });
    } catch (error) {
      console.error('Error in night completion:', error);
      Alert.alert('Error', 'Failed to complete night phase');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open link modal for Cupid/Parasyte/Clone
  const handleOpenLinkModal = (linkType: 'cupid' | 'parasyte' | 'clone', actor: GamePlayer) => {
    setActiveLinkType(linkType);
    setActiveLinkActor(actor);
    setShowLinkModal(true);
  };

  // Open Ship Doctor protection modal
  const handleOpenShipDoctorModal = (doctor: GamePlayer) => {
    setActiveShipDoctor(doctor);
    setShowShipDoctorModal(true);
  };

  // Open generic night action modal
  const handleOpenNightActionModal = (player: GamePlayer) => {
    setActiveActionPlayer(player);
    setShowNightActionModal(true);
  };

  // Get players with linking roles (Night 1 only)
  const getLinkingPlayers = () => {
    if (night_number !== 1) return [];
    const linkRoles = ['cupid', 'clone', 'parasyte_alien'];
    return players.filter(p => p.is_alive && linkRoles.includes(p.role));
  };

  // Get Ship Doctor player (Night 2+)
  const getShipDoctor = () => {
    if (night_number < 2) return null;
    return players.find(p => p.is_alive && p.role === 'ship_doctor');
  };

  // Get players with night actions
  const getPlayersWithNightActions = () => {
    const actionRoles = [
      'bioscanner', 'junior_scanner', 'dna_tracker', 'detective',
      'alien_scanner', 'watchman', 'scientist', 'silencer',
      'alien', 'predator'
    ];
    return players.filter(p => p.is_alive && actionRoles.includes(p.role));
  };

  const handleCompleteNight = async () => {
    try {
      setIsProcessing(true);

      // Process all night actions and determine results
      if (!canModerate) {
        return;
      }

      // Check for Echo Beacon before completing
      const echoBeacon = checkForEchoBeacon();
      if (echoBeacon) {
        setActiveEchoBeacon(echoBeacon);
        setShowEchoBeaconModal(true);
        setIsProcessing(false);
        return;
      }

      await proceedWithNightCompletion();

    } catch (error) {
      console.error('Error completing night:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStepInfo = getCurrentStepInfo();

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
            Night {night_number}
          </Text>
          <Text style={styles.subtitle}>
            {night_number === 1 ? 'Setup Phase' : 'Action Phase'}
          </Text>
        </View>

        {/* Progress Bar */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.progressTitle}>Night Progress</Text>
            <ProgressBar 
              progress={getProgress()} 
              color={darkTheme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {nightSteps.length}
            </Text>
          </Card.Content>
        </Card>

        {/* Current Step */}
        {currentStepInfo && (
          <Card style={styles.stepCard}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>{currentStepInfo.title}</Text>
                <Chip 
                  mode={currentStepInfo.isCompleted ? 'flat' : 'outlined'}
                  style={[
                    styles.statusChip,
                    currentStepInfo.isCompleted && { backgroundColor: darkTheme.colors.primary }
                  ]}
                  textStyle={{ color: currentStepInfo.isCompleted ? darkTheme.colors.background : darkTheme.colors.onSurface }}
                >
                  {currentStepInfo.isCompleted ? 'Complete' : 'Active'}
                </Chip>
              </View>
              
              <Text style={styles.stepDescription}>
                {currentStepInfo.description}
              </Text>

              <View style={styles.rolesSection}>
                <Text style={styles.rolesTitle}>Active Roles:</Text>
                <View style={styles.roleChips}>
                  {currentStepInfo.roles.map((role, index) => (
                    <Chip
                      key={index}
                      mode="outlined"
                      style={styles.roleChip}
                      textStyle={styles.roleChipText}
                    >
                      {ROLES[role]?.name || role}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsTitle}>Instructions:</Text>
                {night_number === 1 ? (
                  <Text style={styles.instructionsText}>
                    {currentStepInfo.id === 'linking' && 
                      "Have players with linking abilities silently choose their targets using hand gestures. Moderator confirms selections."
                    }
                    {currentStepInfo.id === 'information' && 
                      "Information gatherers silently point to their targets. Moderator shows results privately to each player."
                    }
                    {currentStepInfo.id === 'aliens_meet' && 
                      "All aliens open eyes together, see each other, then close eyes. No eliminations tonight."
                    }
                  </Text>
                ) : (
                  <Text style={styles.instructionsText}>
                    {currentStepInfo.id === 'protections' && 
                      "Protective roles silently point to players they want to protect."
                    }
                    {currentStepInfo.id === 'information' && 
                      "Information gatherers point to targets for scanning."
                    }
                    {currentStepInfo.id === 'alien_kills' && 
                      "Aliens silently agree on elimination targets."
                    }
                    {currentStepInfo.id === 'other_actions' && 
                      "Special roles perform their unique night actions."
                    }
                  </Text>
                )}
              </View>

              {/* Action Buttons for Current Step */}
              {canModerate && currentStepInfo.id === 'linking' && (
                <View style={styles.actionButtonsSection}>
                  <Text style={styles.actionButtonsTitle}>Record Actions:</Text>
                  {getLinkingPlayers().map((player) => {
                    const linkType = player.role === 'cupid' ? 'cupid' :
                                     player.role === 'clone' ? 'clone' : 'parasyte';
                    const hasLink = gameLinks.some(l =>
                      l.link_type === linkType &&
                      (l.player1_id === player.id || l.player2_id === player.id)
                    );
                    return (
                      <Button
                        key={player.id}
                        mode={hasLink ? 'contained' : 'outlined'}
                        onPress={() => handleOpenLinkModal(linkType, player)}
                        disabled={hasLink}
                        style={styles.actionButton}
                      >
                        {hasLink ? `✓ ${player.username} (${ROLES[player.role]?.name})` :
                                  `${player.username} (${ROLES[player.role]?.name})`}
                      </Button>
                    );
                  })}
                </View>
              )}

              {canModerate && currentStepInfo.id === 'protections' && (
                <View style={styles.actionButtonsSection}>
                  <Text style={styles.actionButtonsTitle}>Record Protections:</Text>
                  {players.filter(p => p.is_alive && p.role === 'watchman').map((player) => (
                    <Button
                      key={player.id}
                      mode="outlined"
                      onPress={() => handleOpenNightActionModal(player)}
                      style={styles.actionButton}
                    >
                      {player.username} (Watchman)
                    </Button>
                  ))}
                  {getShipDoctor() && (
                    <Button
                      mode="outlined"
                      onPress={() => handleOpenShipDoctorModal(getShipDoctor()!)}
                      style={styles.actionButton}
                    >
                      {getShipDoctor()!.username} (Ship Doctor)
                    </Button>
                  )}
                </View>
              )}

              {canModerate && (currentStepInfo.id === 'information' || currentStepInfo.id === 'alien_kills' || currentStepInfo.id === 'other_actions') && (
                <View style={styles.actionButtonsSection}>
                  <Text style={styles.actionButtonsTitle}>Record Actions:</Text>
                  {currentStepInfo.roles.map((role) => {
                    const playersWithRole = players.filter(p => p.is_alive && p.role === role);
                    return playersWithRole.map((player) => (
                      <Button
                        key={player.id}
                        mode="outlined"
                        onPress={() => handleOpenNightActionModal(player)}
                        style={styles.actionButton}
                      >
                        {player.username} ({ROLES[role]?.name || role})
                      </Button>
                    ));
                  })}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* All Steps Overview */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Night Steps</Text>
            {nightSteps.map((step, index) => (
              <List.Item
                key={step.id}
                title={step.title}
                description={`${step.roles.length} roles involved`}
                left={() => (
                  <Text style={[
                    styles.stepNumber,
                    { 
                      backgroundColor: index === currentStep ? darkTheme.colors.primary : 
                                       step.isCompleted ? darkTheme.colors.outline : darkTheme.colors.surfaceVariant 
                    }
                  ]}>
                    {index + 1}
                  </Text>
                )}
                right={() => step.isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
                style={[
                  styles.stepListItem,
                  index === currentStep && styles.activeStepItem
                ]}
              />
            ))}
          </Card.Content>
        </Card>

        {/* Navigation Controls */}
        <View style={styles.controls}>
          <View style={styles.navigationButtons}>
            <Button
              mode="outlined"
              onPress={handlePreviousStep}
              disabled={currentStep === 0}
              style={styles.navButton}
              labelStyle={styles.navButtonText}
            >
              ← Previous Step
            </Button>

            {currentStep < nightSteps.length - 1 ? (
              <Button
                mode="contained"
                onPress={handleNextStep}
                style={styles.navButton}
                labelStyle={styles.navButtonText}
              >
                Next Step →
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleCompleteNight}
                loading={isProcessing}
                disabled={isProcessing || !canModerate}
                style={styles.completeButton}
                labelStyle={styles.completeButtonText}
              >
                {isProcessing ? 'Processing...' : 'Complete Night →'}
              </Button>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Echo Beacon Moderator Modal */}
      {activeEchoBeacon && (
        <EchoBeaconModeratorModal
          visible={showEchoBeaconModal}
          onClose={() => {
            setShowEchoBeaconModal(false);
            setActiveEchoBeacon(null);
          }}
          amulet={activeEchoBeacon}
          players={players}
          nightActions={completedActions}
          onAmuletUsed={handleEchoBeaconUsed}
        />
      )}

      {/* Link Creation Modal (Cupid/Parasyte/Clone) */}
      {activeLinkType && activeLinkActor && (
        <LinkCreationModal
          visible={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setActiveLinkType(null);
            setActiveLinkActor(null);
          }}
          linkType={activeLinkType}
          actorPlayer={activeLinkActor}
          players={players}
          gameId={game_id}
          onLinkCreated={async (link) => {
            const refreshedLinks = await GameService.getGameLinks(game_id).catch(() => []);
            setGameLinks(refreshedLinks);
          }}
        />
      )}

      {/* Ship Doctor Protection Modal */}
      {activeShipDoctor && (
        <ShipDoctorProtectionModal
          visible={showShipDoctorModal}
          onClose={() => {
            setShowShipDoctorModal(false);
            setActiveShipDoctor(null);
          }}
          shipDoctor={activeShipDoctor}
          players={players}
          gameId={game_id}
          nightNumber={night_number}
          onProtectionSet={(targetId) => {
            console.log('Ship Doctor protected:', targetId);
          }}
        />
      )}

      {/* Night Action Modal (Generic for scans, protections, etc.) */}
      {activeActionPlayer && (
        <NightActionModal
          visible={showNightActionModal}
          onClose={() => {
            setShowNightActionModal(false);
            setActiveActionPlayer(null);
          }}
          actor={activeActionPlayer}
          players={players}
          gameId={game_id}
          nightNumber={night_number}
          onActionRecorded={(action) => {
            setCompletedActions([...completedActions, action]);
          }}
        />
      )}
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
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    flex: 1,
  },
  statusChip: {
    marginLeft: spacing.sm,
  },
  stepDescription: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  rolesSection: {
    marginBottom: spacing.lg,
  },
  rolesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    marginBottom: spacing.xs,
  },
  roleChipText: {
    fontSize: 12,
    color: darkTheme.colors.primary,
  },
  instructionsSection: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  stepListItem: {
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  activeStepItem: {
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.background,
  },
  checkmark: {
    fontSize: 18,
    color: darkTheme.colors.primary,
  },
  controls: {
    marginTop: spacing.lg,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  navButtonText: {
    fontSize: 14,
  },
  completeButton: {
    flex: 1,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  completeButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  actionButtonsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outline,
  },
  actionButtonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
    borderColor: darkTheme.colors.primary,
  },
});

export default NightPhaseScreen;