import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Chip, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { assignStandardRoles, AssignmentResult, shuffleRoles } from '../utils/roleAssignment';
import { GameService } from '../services/gameService';

type GameSetupScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'GameSetup'>;
  route: RouteProp<NavigationStackParamList, 'GameSetup'>;
};

const GameSetupScreen: React.FC<GameSetupScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id } = route.params;
  const { current_game, players, setPlayers, currentUser } = useGameStore();
  
  const [playerCount, setPlayerCount] = useState(8);
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  // Generate role assignment when player count changes
  useEffect(() => {
    if (current_game?.game_mode === 'standard') {
      try {
        const result = assignStandardRoles(playerCount);
        setAssignment(result);
      } catch (error) {
        console.error('Error assigning roles:', error);
      }
    }
  }, [playerCount, current_game?.game_mode]);

  const handleAssignRoles = async () => {
    if (!assignment || !current_game) return;

    try {
      setIsAssigning(true);

      // Get current players from Supabase
      const currentPlayers = await GameService.getGamePlayers(current_game.id);
      
      if (currentPlayers.length === 0) {
        Alert.alert('No Players', 'No players have joined the game yet. Share the game code to get players!');
        return;
      }

      if (currentPlayers.length !== playerCount) {
        Alert.alert(
          'Player Count Mismatch', 
          `Expected ${playerCount} players but found ${currentPlayers.length}. Please adjust player count or wait for more players to join.`
        );
        return;
      }

      // Shuffle the role assignments
      const shuffledRoles = shuffleRoles(assignment.roles);

      // Create role assignments mapping
      const roleAssignments = currentPlayers.map((player, index) => ({
        playerId: player.id,
        role: shuffledRoles[index].role,
        team: shuffledRoles[index].team,
      }));

      // Assign roles in Supabase
      const updatedPlayers = await GameService.assignRolesToPlayers(current_game.id, roleAssignments);

      // Update local store
      setPlayers(updatedPlayers);

      Alert.alert(
        'Roles Assigned!',
        `${updatedPlayers.length} players have been assigned roles. The game is ready to start!`,
        [
          {
            text: 'View Roles',
            onPress: () => setShowRoles(true),
          },
          {
            text: 'Start Game',
            style: 'default',
            onPress: async () => {
              try {
                await GameService.startGame(current_game.id);
                Alert.alert('Game Started!', 'Players can now view their roles and the game has begun!');
                // TODO: Navigate to moderator dashboard
              } catch (error) {
                console.error('Error starting game:', error);
                Alert.alert('Error', 'Failed to start game');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error assigning roles:', error);
      Alert.alert('Error', 'Failed to assign roles: ' + (error as Error).message);
    } finally {
      setIsAssigning(false);
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'crew': return '#4CAF50';
      case 'alien': return '#F44336';
      case 'independent': return '#9C27B0';
      default: return darkTheme.colors.outline;
    }
  };

  if (!assignment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Loading Game Setup...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Game Setup</Text>
          <Text style={styles.subtitle}>
            {current_game?.game_mode === 'standard' ? 'Standard Mode' : 'Custom Mode'}
          </Text>
        </View>

        {/* Player Count Input */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Player Count</Text>
            <View style={styles.playerCountContainer}>
              <View style={styles.playerCountInput}>
                <TextInput
                  label="Number of Players"
                  value={playerCount.toString()}
                  onChangeText={(text) => {
                    const count = parseInt(text) || 0;
                    if (count >= 5 && count <= 15) {
                      setPlayerCount(count);
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.textInput}
                  maxLength={2}
                />
              </View>
              <Text style={styles.playerCountHelp}>Min: 5 • Optimal: 8-12 • Max: 15</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Balance Overview */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Team Balance</Text>
            <View style={styles.balanceContainer}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Crew Score</Text>
                <Text style={[styles.balanceValue, { color: '#4CAF50' }]}>
                  +{assignment.balance.crew_score}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Alien Score</Text>
                <Text style={[styles.balanceValue, { color: '#F44336' }]}>
                  -{assignment.balance.alien_score}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={[
                  styles.balanceValue,
                  { color: assignment.isBalanced ? '#4CAF50' : '#FF9800' }
                ]}>
                  {assignment.balance.total_score > 0 ? '+' : ''}{assignment.balance.total_score}
                </Text>
              </View>
            </View>
            <Chip
              mode={assignment.isBalanced ? 'flat' : 'outlined'}
              style={[
                styles.balanceChip,
                { backgroundColor: assignment.isBalanced ? '#4CAF50' : '#FF9800' }
              ]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {assignment.isBalanced ? 'Well Balanced' : 'Slightly Unbalanced'}
            </Chip>
          </Card.Content>
        </Card>

        {/* Role Preview */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Role Distribution</Text>
            <View style={styles.roleGrid}>
              {assignment.roles.reduce((acc, role) => {
                const existing = acc.find(r => r.role === role.role);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ role: role.role, team: role.team, count: 1, definition: role.definition });
                }
                return acc;
              }, [] as Array<{role: string, team: string, count: number, definition: any}>)
              .map((roleInfo, index) => (
                <Chip
                  key={index}
                  mode="flat"
                  style={[
                    styles.roleChip,
                    { backgroundColor: getTeamColor(roleInfo.team) }
                  ]}
                  textStyle={styles.roleChipText}
                >
                  {roleInfo.count > 1 ? `${roleInfo.count}x ` : ''}{roleInfo.definition.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Assigned Players (if roles are assigned) */}
        {players.length > 0 && showRoles && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Player Assignments</Text>
              {players.map((player, index) => (
                <View key={player.id} style={styles.playerRow}>
                  <Text style={styles.playerName}>{player.username}</Text>
                  <Chip
                    mode="flat"
                    style={[
                      styles.playerRoleChip,
                      { backgroundColor: getTeamColor(player.team) }
                    ]}
                    textStyle={styles.roleChipText}
                  >
                    {assignment.roles.find(r => r.role === player.role)?.definition.name || player.role}
                  </Chip>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {players.length === 0 ? (
            <Button
              mode="contained"
              onPress={handleAssignRoles}
              loading={isAssigning}
              disabled={isAssigning || !assignment.isBalanced}
              style={styles.assignButton}
              labelStyle={styles.assignButtonText}
            >
              {isAssigning ? 'ASSIGNING ROLES...' : 'ASSIGN ROLES & START GAME'}
            </Button>
          ) : (
            <>
              <Button
                mode="outlined"
                onPress={() => setShowRoles(!showRoles)}
                style={styles.toggleButton}
                labelStyle={styles.toggleButtonText}
              >
                {showRoles ? 'HIDE ROLES' : 'SHOW ROLES'}
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  // Navigate to Night 1 phase
                  navigation.navigate('NightPhase', { 
                    game_id: current_game.id, 
                    night_number: 1 
                  });
                }}
                style={styles.startButton}
                labelStyle={styles.startButtonText}
              >
                START GAME
              </Button>
            </>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {assignment.isBalanced 
              ? 'This game configuration is well-balanced for fair gameplay.'
              : 'This configuration is slightly unbalanced. Consider adjusting player count.'}
          </Text>
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
    textAlign: 'center',
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
  playerCountContainer: {
    gap: spacing.sm,
  },
  playerCountInput: {
    maxWidth: 150,
  },
  textInput: {
    backgroundColor: darkTheme.colors.background,
  },
  playerCountHelp: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  balanceChip: {
    alignSelf: 'center',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    marginBottom: spacing.xs,
  },
  roleChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  playerName: {
    fontSize: 14,
    color: darkTheme.colors.onSurface,
    fontWeight: '500',
  },
  playerRoleChip: {
    paddingHorizontal: spacing.sm,
  },
  actionButtons: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  assignButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  assignButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleButton: {
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  toggleButtonText: {
    color: darkTheme.colors.onSurface,
    fontSize: 14,
  },
  startButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  startButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default GameSetupScreen;