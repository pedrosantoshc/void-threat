import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Button, Card, Avatar, Chip, List, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList, GameSession } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../config/supabase';
import { GameService } from '../services/gameService';

type UserDashboardScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'UserDashboard'>;
};

interface UserStats {
  total_games: number;
  games_won: number;
  games_as_crew: number;
  games_as_alien: number;
  games_as_independent: number;
  favorite_role?: string;
  win_rate: number;
  survival_rate: number;
}

const UserDashboardScreen: React.FC<UserDashboardScreenProps> = ({ navigation }) => {
  const { currentUser, setCurrentUser, resetGame } = useGameStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      // Load user statistics
      await loadUserStats();
      // Load recent games
      await loadRecentGames();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!currentUser) return;

    try {
      // In a real app, you'd have a user_stats table or compute these from game_players
      // For now, we'll create mock stats
      const mockStats: UserStats = {
        total_games: 15,
        games_won: 8,
        games_as_crew: 10,
        games_as_alien: 4,
        games_as_independent: 1,
        favorite_role: 'bioscanner',
        win_rate: 53.3,
        survival_rate: 66.7,
      };

      setUserStats(mockStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentGames = async () => {
    if (!currentUser) return;

    try {
      // Get user's recent games
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          game_players!inner(role, team, is_alive)
        `)
        .eq('game_players.user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading recent games:', error);
        return;
      }

      setRecentGames(data || []);
    } catch (error) {
      console.error('Error loading recent games:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            setCurrentUser(null);
            resetGame();
            navigation.navigate('Landing');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGameStatusColor = (phase: string) => {
    switch (phase) {
      case 'lobby': return darkTheme.colors.primary;
      case 'ended': return darkTheme.colors.outline;
      default: return '#FF9800'; // In progress
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

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Please sign in to view your dashboard</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={60}
              label={currentUser.name.charAt(0).toUpperCase()}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userEmail}>{currentUser.email}</Text>
            </View>
          </View>
          <IconButton
            icon="cog"
            size={24}
            onPress={() => navigation.navigate('UserProfile')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('CreateGame')}
            style={styles.primaryAction}
            labelStyle={styles.primaryActionText}
          >
            CREATE GAME
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('JoinGame')}
            style={styles.secondaryAction}
            labelStyle={styles.secondaryActionText}
          >
            JOIN GAME
          </Button>
        </View>

        {/* Statistics */}
        {userStats && (
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>📊 Your Statistics</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{userStats.total_games}</Text>
                  <Text style={styles.statLabel}>Games Played</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                    {userStats.win_rate}%
                  </Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#2196F3' }]}>
                    {userStats.survival_rate}%
                  </Text>
                  <Text style={styles.statLabel}>Survival Rate</Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.roleStats}>
                <Text style={styles.sectionTitle}>Team Performance</Text>
                <View style={styles.teamStats}>
                  <View style={styles.teamStat}>
                    <Chip
                      mode="flat"
                      style={[styles.teamChip, { backgroundColor: '#4CAF50' }]}
                      textStyle={styles.chipText}
                    >
                      Crew
                    </Chip>
                    <Text style={styles.teamStatValue}>{userStats.games_as_crew}</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Chip
                      mode="flat"
                      style={[styles.teamChip, { backgroundColor: '#F44336' }]}
                      textStyle={styles.chipText}
                    >
                      Alien
                    </Chip>
                    <Text style={styles.teamStatValue}>{userStats.games_as_alien}</Text>
                  </View>
                  <View style={styles.teamStat}>
                    <Chip
                      mode="flat"
                      style={[styles.teamChip, { backgroundColor: '#9C27B0' }]}
                      textStyle={styles.chipText}
                    >
                      Independent
                    </Chip>
                    <Text style={styles.teamStatValue}>{userStats.games_as_independent}</Text>
                  </View>
                </View>
              </View>

              {userStats.favorite_role && (
                <>
                  <Divider style={styles.divider} />
                  <View style={styles.favoriteRole}>
                    <Text style={styles.sectionTitle}>Favorite Role</Text>
                    <Chip
                      mode="flat"
                      style={styles.favoriteRoleChip}
                      textStyle={styles.favoriteRoleText}
                    >
                      {userStats.favorite_role}
                    </Chip>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Recent Games */}
        <Card style={styles.recentGamesCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>🎮 Recent Games</Text>
            
            {recentGames.length === 0 ? (
              <Text style={styles.emptyState}>
                No games yet. Create or join a game to get started!
              </Text>
            ) : (
              recentGames.map((game, index) => (
                <List.Item
                  key={game.id}
                  title={`Game ${game.game_code}`}
                  description={formatDate(game.created_at)}
                  left={() => (
                    <View style={styles.gameIcon}>
                      <Text style={styles.gameIconText}>
                        {game.current_phase === 'ended' ? '🏁' : '🎯'}
                      </Text>
                    </View>
                  )}
                  right={() => (
                    <View style={styles.gameStatus}>
                      <Chip
                        mode="flat"
                        style={[
                          styles.statusChip,
                          { backgroundColor: getGameStatusColor(game.current_phase) }
                        ]}
                        textStyle={styles.statusChipText}
                      >
                        {game.current_phase}
                      </Chip>
                    </View>
                  )}
                  style={[
                    styles.gameItem,
                    index < recentGames.length - 1 && styles.gameItemBorder
                  ]}
                />
              ))
            )}
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Button
          mode="outlined"
          onPress={handleSignOut}
          style={styles.signOutButton}
          labelStyle={styles.signOutButtonText}
        >
          SIGN OUT
        </Button>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: darkTheme.colors.primary,
    marginRight: spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  primaryActionText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryAction: {
    flex: 1,
    borderColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  secondaryActionText: {
    color: darkTheme.colors.primary,
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: darkTheme.colors.outline,
    marginVertical: spacing.lg,
  },
  roleStats: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  teamStat: {
    alignItems: 'center',
  },
  teamChip: {
    marginBottom: spacing.sm,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  teamStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  favoriteRole: {
    alignItems: 'center',
  },
  favoriteRoleChip: {
    backgroundColor: darkTheme.colors.primary,
  },
  favoriteRoleText: {
    color: darkTheme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  recentGamesCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  emptyState: {
    textAlign: 'center',
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: spacing.lg,
  },
  gameItem: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  gameItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  gameIconText: {
    fontSize: 16,
  },
  gameStatus: {
    justifyContent: 'center',
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  signOutButton: {
    borderColor: darkTheme.colors.error,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  signOutButtonText: {
    color: darkTheme.colors.error,
    fontSize: 14,
  },
});

export default UserDashboardScreen;