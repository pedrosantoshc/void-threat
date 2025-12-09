import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';

type CreateGameScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'CreateGame'>;
};

const CreateGameScreen: React.FC<CreateGameScreenProps> = ({ navigation }) => {
  // Generate random game code
  const generateGameCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'VOID';
    for (let i = 0; i < 3; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const gameCode = generateGameCode();
  const gameUrl = `https://void.app/join/${gameCode}`;
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(gameCode);
      showSnackbar('Game code copied!');
    } catch (error) {
      showSnackbar('Failed to copy code');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(gameUrl);
      showSnackbar('Game link copied!');
    } catch (error) {
      showSnackbar('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(gameUrl, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Void Threat Game',
        });
      } else {
        // Fallback to clipboard
        await Clipboard.setStringAsync(gameUrl);
        showSnackbar('Link copied to clipboard!');
      }
    } catch (error) {
      console.log('Share error:', error);
      showSnackbar('Failed to share');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Game Code Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>GAME CODE</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.gameCode}>{gameCode}</Text>
              <Button
                icon="content-copy"
                onPress={handleCopyCode}
                textColor={darkTheme.colors.primary}
              />
            </View>
            <Text style={styles.codeSubtitle}>Tap to copy</Text>
          </Card.Content>
        </Card>

        {/* Share Link Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>SHARE LINK</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.gameUrl}>{gameUrl}</Text>
              <View style={styles.linkActions}>
                <Button
                  icon="content-copy"
                  onPress={handleCopyUrl}
                  textColor={darkTheme.colors.primary}
                >
                  Copy
                </Button>
                <Button
                  icon="share"
                  onPress={handleShare}
                  textColor={darkTheme.colors.primary}
                >
                  Share
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* QR Code Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>OR SCAN QR CODE</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={gameUrl}
                size={120}
                color="#FFFFFF"
                backgroundColor="#0A0E27"
                logo={undefined}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Share Buttons */}
        <View style={styles.shareButtons}>
          <Text style={styles.shareTitle}>SHARE WITH PLAYERS</Text>
          <View style={styles.shareButtonRow}>
            <Button
              mode="outlined"
              onPress={handleShare}
              style={styles.shareButton}
              labelStyle={styles.shareButtonText}
            >
              WhatsApp
            </Button>
            <Button
              mode="outlined"
              onPress={handleShare}
              style={styles.shareButton}
              labelStyle={styles.shareButtonText}
            >
              Messages
            </Button>
            <Button
              mode="outlined"
              onPress={handleShare}
              style={styles.shareButton}
              labelStyle={styles.shareButtonText}
            >
              More...
            </Button>
          </View>
        </View>

        {/* Next Button */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={() => {
              // TODO: Create actual game in database
              // For now, navigate to mode selector with placeholder game ID
              navigation.navigate('GameModeSelector', { game_id: 'placeholder' });
            }}
            style={styles.nextButton}
            labelStyle={styles.nextButtonText}
          >
            NEXT: CHOOSE GAME MODE
          </Button>
        </View>
      </View>

      {/* Snackbar for copy/share feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: darkTheme.colors.surface }}
      >
        <Text style={{ color: darkTheme.colors.primary }}>{snackbarMessage}</Text>
      </Snackbar>
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
  card: {
    backgroundColor: darkTheme.colors.surface,
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: 'bold',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gameCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: darkTheme.colors.primary,
    fontFamily: 'monospace',
  },
  codeSubtitle: {
    fontSize: typography.bodySmall.fontSize,
    color: darkTheme.colors.onSurfaceVariant,
  },
  linkContainer: {
    gap: spacing.sm,
  },
  gameUrl: {
    fontSize: typography.body.fontSize,
    color: darkTheme.colors.primary,
    fontFamily: 'monospace',
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qrContainer: {
    alignItems: 'center',
  },
  shareButtons: {
    alignItems: 'center',
  },
  shareTitle: {
    fontSize: typography.bodyLarge.fontSize,
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.md,
  },
  shareButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareButton: {
    borderColor: darkTheme.colors.primary,
    flex: 1,
  },
  shareButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 12,
  },
  buttonSection: {
    marginTop: 'auto',
  },
  nextButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  nextButtonText: {
    color: darkTheme.colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CreateGameScreen;