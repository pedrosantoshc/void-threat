import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, Chip, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';

type DayPhaseScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'DayPhase'>;
  route: RouteProp<NavigationStackParamList, 'DayPhase'>;
};

const DayPhaseScreen: React.FC<DayPhaseScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id, day_number } = route.params;
  const { current_game, players } = useGameStore();
  
  const [discussionTimeLeft, setDiscussionTimeLeft] = useState(300); // 5 minutes default
  const [isDiscussionActive, setIsDiscussionActive] = useState(false);
  const [votingResults, setVotingResults] = useState<Record<string, number>>({});
  const [eliminatedPlayer, setEliminatedPlayer] = useState<GamePlayer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const alivePlayers = players.filter(p => p.is_alive);

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
      
      // TODO: Update player status in database
      // TODO: Check for special elimination effects (Tragic Hero, Links, etc.)
      // TODO: Check win conditions
      
      setEliminatedPlayer(player);
      
      setTimeout(() => {
        proceedToNight();
      }, 3000);
      
    } catch (error) {
      console.error('Error eliminating player:', error);
      Alert.alert('Error', 'Failed to eliminate player');
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToNight = async () => {
    try {
      setIsProcessing(true);
      
      // Check win conditions first
      // TODO: Implement win condition checking
      
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
                    disabled={isProcessing}
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
            disabled={isProcessing}
            style={styles.controlButton}
            labelStyle={styles.controlButtonText}
          >
            Skip Voting
          </Button>

          <Button
            mode="contained"
            onPress={proceedToNight}
            disabled={isProcessing}
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
});

export default DayPhaseScreen;