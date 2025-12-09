import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import GuestDashboardScreen from './GuestDashboardScreen';

type DashboardScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Dashboard'>;
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const currentUser = useGameStore((state) => state.currentUser);

  // If user is a guest, show guest dashboard
  if (currentUser?.is_guest) {
    return <GuestDashboardScreen navigation={navigation} />;
  }

  // For logged-in users, show stats dashboard
  const stats = {
    gamesPlayed: 0,
    minutesPlayed: 0,
    avgRoundsSurvived: 0,
    mostCommonRole: 'None yet',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VOID THREAT</Text>
        </View>

        {/* Player Stats */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>PLAYER STATS</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>📊</Text>
                <Text style={styles.statLabel}>Games Played</Text>
                <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>⏱️</Text>
                <Text style={styles.statLabel}>Minutes Played</Text>
                <Text style={styles.statValue}>{stats.minutesPlayed}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🎯</Text>
                <Text style={styles.statLabel}>Avg Rounds Survived</Text>
                <Text style={styles.statValue}>{stats.avgRoundsSurvived}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🎭</Text>
                <Text style={styles.statLabel}>Most Common Role</Text>
                <Text style={styles.statValue}>{stats.mostCommonRole}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('CreateGame')}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            CREATE NEW GAME
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('JoinGame')}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonText}
          >
            JOIN EXISTING GAME
          </Button>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.primary,
  },
  statsCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 14,
    color: darkTheme.colors.onSurface,
    fontWeight: '700',
  },
  buttonSection: {
    gap: spacing.md,
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 16,
  },
});

export default DashboardScreen;