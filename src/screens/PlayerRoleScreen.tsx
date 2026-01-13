import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { ROLES } from '../constants/roles';
import AmuletIndicator from '../components/AmuletIndicator';

type PlayerRoleScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'PlayerRole'>;
  route: RouteProp<NavigationStackParamList, 'PlayerRole'>;
};

const PlayerRoleScreen: React.FC<PlayerRoleScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id, player_id } = route.params;
  const { players, amulets } = useGameStore();
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [showRole, setShowRole] = useState(false);

  useEffect(() => {
    const foundPlayer = players.find(p => p.id === player_id);
    if (foundPlayer) {
      setPlayer(foundPlayer);
    }
  }, [player_id, players]);

  if (!player) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Player Not Found</Text>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // If eliminated, send player into spectator mode (read-only).
  // We keep the role reveal accessible (if they already opened it), but provide a clear path to spectate.
  const eliminated = !player.is_alive;

  const roleDefinition = ROLES[player.role];

  const getRoleArt = (roleKey: string) => {
    const fallback = require('../../assets/optimized/ui/void-threat-logo.png');
    switch (roleKey) {
      // Crew
      case 'crew_member':
        return require('../../assets/optimized/crew/crew_member.jpg');
      case 'bioscanner':
        return require('../../assets/optimized/crew/bioscanner.jpg');
      case 'junior_scanner':
        return require('../../assets/optimized/crew/junior_scanner.jpg');
      case 'dna_tracker':
        return require('../../assets/optimized/crew/dna_tracker.jpg');
      case 'observer':
        return require('../../assets/optimized/crew/observer.jpg');
      case 'tragic_hero':
        return require('../../assets/optimized/crew/tragic_hero.jpg');
      case 'scientist':
        return require('../../assets/optimized/crew/scientist.jpg');
      case 'watchman':
        return require('../../assets/optimized/crew/watchman.jpg');
      case 'ship_captain':
        return require('../../assets/optimized/crew/ship_captain.jpg');
      case 'vip_passenger':
        return require('../../assets/optimized/crew/vip_passenger.jpg');
      case 'ship_doctor':
        return require('../../assets/optimized/crew/ship_doctor.jpg');
      case 'detective':
        return require('../../assets/optimized/crew/detective.jpg');
      case 'silencer':
        return require('../../assets/optimized/crew/silencer.jpg');
      case 'soldier':
        return require('../../assets/optimized/crew/soldier.jpg');
      case 'clone':
        return require('../../assets/optimized/crew/clone.jpg');
      case 'false_positive':
        return require('../../assets/optimized/crew/false_positive.jpg');
      case 'quarantined_crew':
        return require('../../assets/optimized/crew/quarantined_crew.jpg');

      // Alien
      case 'alien':
        return require('../../assets/optimized/alien/alien.jpg');
      case 'alien_pup':
        return require('../../assets/optimized/alien/alien_pup.jpg');
      case 'sleep_alien':
        return require('../../assets/optimized/alien/sleep_alien.jpg');
      case 'rogue_alien':
        return require('../../assets/optimized/alien/rogue_alien.jpg');
      case 'alien_scanner':
        return require('../../assets/optimized/alien/alien_scanner.jpg');
      case 'parasyte_alien':
        return require('../../assets/optimized/alien/parasyte_alien.jpg');
      case 'humanoid_alien':
        return require('../../assets/optimized/alien/humanoid_alien.jpg');
      case 'infected_crewmember':
        return require('../../assets/optimized/alien/infected_crewmember.jpg');

      // Independent
      case 'predator':
        return require('../../assets/optimized/alien/predator.jpg');

      default:
        return fallback;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {!showRole ? (
          /* Role Reveal Screen */
          <View style={styles.revealContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Ready to See Your Role?</Text>
              <Text style={styles.subtitle}>
                {player.username}, tap the button below to reveal your secret role.
              </Text>
            </View>

            <View style={styles.warningCard}>
              <Card style={[styles.card, { backgroundColor: darkTheme.colors.errorContainer }]}>
                <Card.Content>
                  <Text style={styles.warningTitle}>⚠️ Keep It Secret!</Text>
                  <Text style={styles.warningText}>
                    Once you see your role, keep it completely secret from other players.
                    Your success depends on it!
                  </Text>
                </Card.Content>
              </Card>
            </View>

            <Button
              mode="contained"
              onPress={() => setShowRole(true)}
              style={styles.revealButton}
              labelStyle={styles.revealButtonText}
            >
              REVEAL MY ROLE
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              labelStyle={styles.backButtonText}
            >
              ← Back to Game Setup
            </Button>
          </View>
        ) : (
          /* Role Display Screen */
          <View style={styles.roleContainer}>
            <View style={styles.header}>
              <Text style={styles.playerName}>{player.username}</Text>
              <Text style={styles.yourRole}>Your Role:</Text>
            </View>

            {/* Role Card */}
            <Card style={[styles.roleCard, { borderColor: getTeamColor(player.team) }]}>
              <Card.Content style={styles.roleContent}>
                <View style={styles.roleArtWrap}>
                  <Image source={getRoleArt(player.role)} style={styles.roleArt} resizeMode="cover" />
                </View>
                <View style={styles.roleHeader}>
                  <Text style={[styles.roleName, { color: getTeamColor(player.team) }]}>
                    {roleDefinition?.name || player.role}
                  </Text>
                  <View style={[styles.teamBadge, { backgroundColor: getTeamColor(player.team) }]}>
                    <Text style={styles.teamBadgeText}>
                      {player.team.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {roleDefinition && (
                  <>
                    <Text style={styles.roleDescription}>
                      {roleDefinition.description}
                    </Text>

                    {roleDefinition.night_action && (
                      <View style={styles.actionSection}>
                        <Text style={styles.actionTitle}>Night Action:</Text>
                        <Text style={styles.actionText}>
                          {roleDefinition.night_action}
                        </Text>
                      </View>
                    )}

                    {roleDefinition.special_conditions && roleDefinition.special_conditions.length > 0 && (
                      <View style={styles.conditionsSection}>
                        <Text style={styles.conditionsTitle}>Special Conditions:</Text>
                        {roleDefinition.special_conditions.map((condition, index) => (
                          <Text key={index} style={styles.conditionText}>
                            • {condition}
                          </Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.gradeSection}>
                      <Text style={styles.gradeText}>
                        Power Level: {roleDefinition.grade}
                      </Text>
                    </View>
                  </>
                )}

                {/* Amulet Indicator */}
                <AmuletIndicator amulets={amulets} playerId={player.id} />
              </Card.Content>
            </Card>

            {/* Win Condition */}
            <Card style={styles.winCard}>
              <Card.Content>
                <Text style={styles.winTitle}>Your Goal:</Text>
                {player.team === 'crew' && (
                  <Text style={styles.winText}>
                    Eliminate all aliens through discussion and voting during day phases.
                    Use your abilities wisely to gather information and protect the crew.
                  </Text>
                )}
                {player.team === 'alien' && (
                  <Text style={styles.winText}>
                    Eliminate crew members during night phases and avoid detection during day votes.
                    Coordinate with your fellow aliens to outnumber the crew.
                  </Text>
                )}
                {player.team === 'independent' && (
                  <Text style={styles.winText}>
                    You have your own unique win condition. Check your role description
                    for specific requirements to achieve victory.
                  </Text>
                )}
              </Card.Content>
            </Card>

            {/* Action Button */}
            <Button
              mode="contained"
              onPress={() => {
                if (eliminated) {
                  navigation.navigate('Spectator', { game_id });
                  return;
                }
                navigation.goBack();
              }}
              style={styles.readyButton}
              labelStyle={styles.readyButtonText}
            >
              {eliminated ? 'SPECTATE GAME' : "I'M READY TO PLAY"}
            </Button>

            {/* Hide Role Button */}
            <Button
              mode="text"
              onPress={() => setShowRole(false)}
              labelStyle={styles.hideButtonText}
            >
              Hide Role (Show Again Later)
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  revealContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  roleContainer: {
    flex: 1,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  yourRole: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
  },
  warningCard: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.onErrorContainer,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: darkTheme.colors.onErrorContainer,
    lineHeight: 20,
    textAlign: 'center',
  },
  revealButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  revealButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 18,
  },
  backButtonText: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
  roleCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
  },
  roleContent: {
    padding: spacing.lg,
  },
  roleArtWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  roleArt: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roleName: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  teamBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  teamBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  roleDescription: {
    fontSize: 16,
    color: darkTheme.colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actionSection: {
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: darkTheme.colors.onSurface,
    lineHeight: 20,
  },
  conditionsSection: {
    marginBottom: spacing.md,
  },
  conditionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  conditionText: {
    fontSize: 14,
    color: darkTheme.colors.onSurface,
    lineHeight: 20,
  },
  gradeSection: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  gradeText: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
  },
  winCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 12,
  },
  winTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  winText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  readyButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  readyButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  hideButtonText: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PlayerRoleScreen;