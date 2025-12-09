import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';

type CreateGameScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'CreateGame'>;
};

const CreateGameScreen: React.FC<CreateGameScreenProps> = ({ navigation }) => {
  // TODO: Generate actual game code
  const gameCode = 'VOID123';
  const gameUrl = `void.app/join/${gameCode}`;

  const handleCopyCode = () => {
    // TODO: Implement clipboard copy
    console.log('Copy code:', gameCode);
  };

  const handleCopyUrl = () => {
    // TODO: Implement clipboard copy
    console.log('Copy URL:', gameUrl);
  };

  const handleShare = () => {
    // TODO: Implement native sharing
    console.log('Share game:', gameUrl);
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
                  compact
                >
                  Copy
                </Button>
                <Button
                  icon="share"
                  onPress={handleShare}
                  textColor={darkTheme.colors.primary}
                  compact
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
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>QR CODE</Text>
                <Text style={styles.qrSubtext}>(Coming soon)</Text>
              </View>
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
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: darkTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkTheme.colors.outline,
  },
  qrText: {
    fontSize: typography.body.fontSize,
    color: darkTheme.colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  qrSubtext: {
    fontSize: typography.bodySmall.fontSize,
    color: darkTheme.colors.outline,
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