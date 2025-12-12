import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, ProgressBar, List, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer, NightAction } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';
import { ROLES } from '../constants/roles';

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
  const { current_game, players, currentUser } = useGameStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [nightSteps, setNightSteps] = useState<NightStep[]>([]);
  const [completedActions, setCompletedActions] = useState<NightAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
      
      // Step 1: Protections first
      const protectionRoles = ['medic', 'guardian'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (protectionRoles.length > 0) {
        steps.push({
          id: 'protections',
          title: 'Protection Phase',
          description: 'Medics and guardians protect players',
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

      // Step 3: Alien kills
      const killerRoles = ['alien', 'hunter_alien'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (killerRoles.length > 0) {
        steps.push({
          id: 'alien_kills',
          title: 'Alien Elimination',
          description: 'Aliens choose their targets',
          roles: killerRoles,
          actionType: 'kill',
          isCompleted: false,
          order: 3,
        });
      }

      // Step 4: Other night actions
      const otherRoles = ['hunter', 'predator'].filter(role => 
        alivePlayers.some(p => p.role === role)
      );
      
      if (otherRoles.length > 0) {
        steps.push({
          id: 'other_actions',
          title: 'Special Actions',
          description: 'Hunter and Predator perform their actions',
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

  const handleCompleteNight = async () => {
    try {
      setIsProcessing(true);
      
      // Process all night actions and determine results
      // TODO: Implement night resolution logic
      
      // Advance to day phase
      if (current_game) {
        await GameService.updateGameSession(current_game.id, {
          current_phase: night_number === 1 ? 'day1' : 'day2plus',
          day_number: night_number === 1 ? 1 : Math.max(current_game.day_number + 1, 2),
        });
      }

      // Navigate to day phase
      navigation.navigate('DayPhase', { 
        game_id: game_id, 
        day_number: night_number === 1 ? 1 : (current_game?.day_number || 1) + 1 
      });
      
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
                disabled={isProcessing}
                style={styles.completeButton}
                labelStyle={styles.completeButtonText}
              >
                {isProcessing ? 'Processing...' : 'Complete Night →'}
              </Button>
            )}
          </View>
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
});

export default NightPhaseScreen;