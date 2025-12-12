import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';

type JoinGameScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'JoinGame'>;
};

const JoinGameScreen: React.FC<JoinGameScreenProps> = ({ navigation }) => {
  const { currentUser, setCurrentGame, setCurrentPlayer } = useGameStore();
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGame = async () => {
    if (!gameCode.trim() || !currentUser) return;

    try {
      setIsLoading(true);
      
      // Join the game
      const { game, player } = await GameService.joinGame(gameCode.toUpperCase(), currentUser);
      
      // Update store
      setCurrentGame(game);
      setCurrentPlayer(player);
      
      // Navigate based on game status
      if (game.status === 'setup') {
        // Game is still in setup, wait for role assignment
        Alert.alert(
          'Joined Game!', 
          `You've successfully joined ${game.game_code}. Wait for the moderator to assign roles and start the game.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Dashboard') // TODO: Navigate to waiting room
            }
          ]
        );
      } else if (game.status === 'playing') {
        // Game is in progress, show role
        navigation.navigate('PlayerRole', { 
          game_id: game.id, 
          player_id: player.id 
        });
      }
      
    } catch (error) {
      console.error('Join game error:', error);
      Alert.alert('Join Failed', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQR = () => {
    // TODO: Implement QR code scanning
    console.log('Open QR scanner');
  };

  const isValidCode = gameCode.trim().length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join Game</Text>
          <Text style={styles.subtitle}>Enter game code or scan QR code</Text>
        </View>

        {/* QR Scanner Option */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.scanSection}>
              <Text style={styles.sectionTitle}>SCAN QR CODE</Text>
              <Button
                mode="outlined"
                onPress={handleScanQR}
                style={styles.scanButton}
                labelStyle={styles.scanButtonText}
                icon="qrcode-scan"
              >
                Open Camera Scanner
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Manual Code Entry */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.codeSection}>
              <Text style={styles.sectionTitle}>ENTER GAME CODE</Text>
              <TextInput
                label="Game Code (e.g., VOID123)"
                value={gameCode}
                onChangeText={(text) => setGameCode(text.toUpperCase())}
                style={styles.textInput}
                maxLength={10}
                autoCapitalize="characters"
                placeholder="VOID123"
                autoFocus
              />
              
              <Button
                mode="contained"
                onPress={handleJoinGame}
                disabled={!isValidCode || isLoading}
                loading={isLoading}
                style={[
                  styles.joinButton,
                  (!isValidCode || isLoading) && styles.disabledButton
                ]}
                labelStyle={styles.joinButtonText}
              >
                {isLoading ? 'JOINING...' : 'JOIN GAME'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need help?</Text>
          <Text style={styles.helpText}>
            Ask the game moderator for the game code or QR code.
            The code usually starts with "VOID" followed by 3 characters.
          </Text>
        </View>

        {/* Back Button */}
        <View style={styles.buttonSection}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            labelStyle={styles.backButtonText}
          >
            BACK TO MENU
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
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
  },
  scanSection: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scanButton: {
    borderColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  scanButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: darkTheme.colors.outline,
  },
  dividerText: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
  },
  codeSection: {
    gap: spacing.lg,
  },
  textInput: {
    backgroundColor: darkTheme.colors.background,
    fontSize: 16,
  },
  joinButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  disabledButton: {
    backgroundColor: darkTheme.colors.outline,
  },
  joinButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonSection: {
    marginTop: 'auto',
  },
  backButton: {
    borderColor: darkTheme.colors.onSurfaceVariant,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
});

export default JoinGameScreen;