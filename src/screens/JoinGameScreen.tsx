import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';

type JoinGameScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'JoinGame'>;
};

const JoinGameScreen: React.FC<JoinGameScreenProps> = ({ navigation }) => {
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGame = async () => {
    if (!gameCode.trim()) return;

    setIsLoading(true);
    
    // TODO: Implement actual game joining logic
    setTimeout(() => {
      setIsLoading(false);
      // For now, just show success message
      console.log('Joining game:', gameCode.toUpperCase());
      // Navigate to waiting screen or game setup
    }, 1000);
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
    fontSize: typography.heading1.fontSize,
    fontWeight: typography.heading1.fontWeight,
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
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
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: 'bold',
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
    fontSize: typography.bodySmall.fontSize,
    color: darkTheme.colors.onSurfaceVariant,
  },
  codeSection: {
    gap: spacing.lg,
  },
  textInput: {
    backgroundColor: darkTheme.colors.background,
    fontSize: typography.bodyLarge.fontSize,
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
    fontWeight: 'bold',
    fontSize: 16,
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  helpTitle: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: typography.body.fontSize,
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