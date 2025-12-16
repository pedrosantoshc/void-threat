import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';

const standardBg = require('../../assets/standard_game_bg.png');
const customBg = require('../../assets/custom_game_bg.png');

type GameModeSelectorScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'GameModeSelector'>;
  route: RouteProp<NavigationStackParamList, 'GameModeSelector'>;
};

const GameModeSelectorScreen: React.FC<GameModeSelectorScreenProps> = ({
  navigation,
  route,
}) => {
  const { game_id } = route.params;
  const { setGameMode, setCurrentGame } = useGameStore();

  const handleStandardMode = () => {
    // Set standard mode (uses all 26 roles)
    setGameMode('standard');
    // Persist to DB (best-effort)
    GameService.updateGameSession(game_id, { game_mode: 'standard', custom_roles: null } as any)
      .then(setCurrentGame)
      .catch(() => undefined);
    // Navigate to game setup with role assignment
    navigation.navigate('GameSetup', { game_id });
  };

  const handleCustomMode = () => {
    // Set custom mode and navigate to role customizer
    setGameMode('custom');
    navigation.navigate('CustomGame', { game_id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Game Mode</Text>
          <Text style={styles.subtitle}>Choose how you want to play</Text>
        </View>

        {/* Mode Options */}
        <View style={styles.modeContainer}>
          {/* Standard Mode */}
          <Card style={styles.modeCard}>
            <ImageBackground source={standardBg} resizeMode="cover" style={styles.bg} imageStyle={styles.bgImage}>
              <View style={styles.bgOverlay} />
              <Card.Content style={styles.cardContent}>
                <View style={styles.modeHeader}>
                  <Text style={styles.modeTitle}>STANDARD</Text>
                  <Text style={styles.modeSubtitle}>Recommended</Text>
                </View>
                <Text style={styles.modeDescription}>
                  Balanced gameplay using all 26 unique roles. Perfect for groups of 5-25 players.
                </Text>
                <View style={styles.modeFeatures}>
                  <Text style={styles.featureText}>• All 26 roles included</Text>
                  <Text style={styles.featureText}>• Auto-balanced teams</Text>
                  <Text style={styles.featureText}>• Quick setup</Text>
                  <Text style={styles.featureText}>• Optimal for 8-12 players</Text>
                </View>
                <Button
                  mode="contained"
                  onPress={handleStandardMode}
                  style={styles.modeButton}
                  labelStyle={styles.modeButtonText}
                >
                  PLAY STANDARD
                </Button>
              </Card.Content>
            </ImageBackground>
          </Card>

          {/* Custom Mode */}
          <Card style={styles.modeCard}>
            <ImageBackground source={customBg} resizeMode="cover" style={styles.bg} imageStyle={styles.bgImage}>
              <View style={styles.bgOverlay} />
              <Card.Content style={styles.cardContent}>
                <View style={styles.modeHeader}>
                  <Text style={styles.modeTitle}>CUSTOM</Text>
                  <Text style={styles.modeSubtitle}>Advanced</Text>
                </View>
                <Text style={styles.modeDescription}>
                  Choose specific roles and customize team balance. Great for experienced players.
                </Text>
                <View style={styles.modeFeatures}>
                  <Text style={styles.featureText}>• Select individual roles</Text>
                  <Text style={styles.featureText}>• Custom team sizes</Text>
                  <Text style={styles.featureText}>• Balance score preview</Text>
                  <Text style={styles.featureText}>• Save custom presets</Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={handleCustomMode}
                  style={styles.modeButton}
                  labelStyle={styles.customButtonText}
                >
                  CUSTOMIZE ROLES
                </Button>
              </Card.Content>
            </ImageBackground>
          </Card>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Need help deciding?</Text>
          <Text style={styles.infoText}>
            Standard mode is perfect for first-time players and provides the most balanced experience.
            Custom mode lets you experiment with different role combinations.
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            labelStyle={styles.backButtonText}
          >
            ← Back to Game Setup
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modeContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  modeCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bg: {
    position: 'relative',
  },
  bgImage: {
    opacity: 1,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: darkTheme.colors.background,
    opacity: 0.6,
  },
  cardContent: {
    padding: spacing.lg,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  modeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.colors.background,
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modeFeatures: {
    marginBottom: spacing.lg,
  },
  featureText: {
    fontSize: 14,
    color: darkTheme.colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  modeButton: {
    borderRadius: 4,
    paddingVertical: spacing.xs,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.background,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.primary,
  },
  infoSection: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xl,
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
    lineHeight: 20,
  },
  bottomActions: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  backButtonText: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
});

export default GameModeSelectorScreen;