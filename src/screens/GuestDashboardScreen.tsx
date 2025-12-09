import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

type GuestDashboardScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Dashboard'>;
};

const GuestDashboardScreen: React.FC<GuestDashboardScreenProps> = ({ navigation }) => {
  const currentUser = useGameStore((state) => state.currentUser);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcome}>Welcome, {currentUser?.username || 'Guest'}!</Text>
          <Text style={styles.subtitle}>Ready to play Void Threat?</Text>
          
          {/* Show avatar if selected */}
          {currentUser?.avatar_icon && (
            <Text style={styles.avatar}>{currentUser.avatar_icon}</Text>
          )}
        </View>

        {/* Game Actions - Only for Guests */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>GAME ACTIONS</Text>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateGame')}
              style={styles.primaryButton}
              icon="plus"
            >
              CREATE NEW GAME
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('JoinGame')}
              style={styles.secondaryButton}
              icon="login"
            >
              JOIN EXISTING GAME
            </Button>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Playing as Guest</Text>
          <Text style={styles.infoText}>
            You're playing without an account. Your progress won't be saved, 
            but you can still create and join games!
          </Text>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('Landing')}
            style={styles.loginPrompt}
          >
            Want to save progress? Login with Google
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
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    fontSize: 48,
    marginTop: spacing.md,
  },
  actionsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  infoSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  loginPrompt: {
    marginTop: spacing.sm,
  },
});

export default GuestDashboardScreen;