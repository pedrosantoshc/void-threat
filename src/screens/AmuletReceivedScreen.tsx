import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, RadioButton, List, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationStackParamList, GamePlayer, Amulet } from '../types';
import { darkTheme, spacing, appColors } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { GameService } from '../services/gameService';
import { AmuletService } from '../services/amuletService';

type AmuletReceivedScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'AmuletReceived'>;
  route: RouteProp<NavigationStackParamList, 'AmuletReceived'>;
};

// Amulet display info
const AMULET_INFO: Record<string, { name: string; icon: string; description: string }> = {
  shielding_device: {
    name: 'Shielding Device',
    icon: '🛡️',
    description: 'You are protected from elimination today and tonight.',
  },
  resonance_tracker: {
    name: 'Resonance Tracker',
    icon: '📡',
    description: 'Learn the previous holder\'s team, but you cannot vote today.',
  },
  neural_implant: {
    name: 'Neural Implant',
    icon: '🧠',
    description: 'Select a player to learn their role TOMORROW (if you survive).',
  },
  bio_scanner: {
    name: 'Bio Scanner',
    icon: '🔬',
    description: 'Scan any player to learn their allegiance.',
  },
  echo_beacon: {
    name: 'Echo Beacon',
    icon: '📻',
    description: 'Moderator will ask about your neighbors\' night activity.',
  },
};

const AmuletReceivedScreen: React.FC<AmuletReceivedScreenProps> = ({
  navigation,
  route,
}) => {
  const { amulet_id, game_id } = route.params;
  const { players, setPlayers } = useGameStore();

  const [amulet, setAmulet] = useState<Amulet | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Shielding Device state
  const [shieldChoice, setShieldChoice] = useState<'pass' | 'destroy'>('pass');

  // Resonance Tracker state
  const [resonanceChoice, setResonanceChoice] = useState<'use' | 'skip'>('use');
  const [previousHolderTeam, setPreviousHolderTeam] = useState<string | null>(null);

  // Neural Implant state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Bio Scanner state
  const [scanTargetId, setScanTargetId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const alivePlayers = players.filter((p) => p.is_alive);

  useEffect(() => {
    loadAmuletData();
  }, [amulet_id, game_id]);

  const loadAmuletData = async () => {
    try {
      setLoading(true);
      const fetchedAmulet = await AmuletService.getAmulet(amulet_id);
      setAmulet(fetchedAmulet);

      const gamePlayers = await GameService.getGamePlayers(game_id);
      setPlayers(gamePlayers);

      // For Resonance Tracker, get previous holder's team
      if (fetchedAmulet?.amulet_type === 'resonance_tracker' && fetchedAmulet.previous_holder_id) {
        const prevHolder = gamePlayers.find((p) => p.id === fetchedAmulet.previous_holder_id);
        if (prevHolder) {
          setPreviousHolderTeam(prevHolder.team);
        }
      }
    } catch (error) {
      console.error('Error loading amulet:', error);
      Alert.alert('Error', 'Failed to load amulet data');
    } finally {
      setLoading(false);
    }
  };

  const handleShieldingDeviceConfirm = async () => {
    if (!amulet) return;
    setProcessing(true);

    try {
      if (shieldChoice === 'pass') {
        // Mark amulet to be passed tomorrow
        await AmuletService.updateAmulet(amulet.id, {
          must_pass_today: true,
        });
        Alert.alert(
          'Choice Confirmed',
          'You will be protected today. The Shielding Device will pass to another player tomorrow.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Mark amulet to be destroyed after tonight
        // The resolution engine will handle the destruction
        await AmuletService.updateAmulet(amulet.id, {
          must_pass_today: false,
        });
        Alert.alert(
          'Choice Confirmed',
          'You will be protected today and tonight. The Shielding Device will be destroyed after tonight.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error processing Shielding Device choice:', error);
      Alert.alert('Error', 'Failed to process your choice');
    } finally {
      setProcessing(false);
    }
  };

  const handleResonanceTrackerConfirm = async () => {
    if (!amulet) return;
    setProcessing(true);

    try {
      if (resonanceChoice === 'use') {
        // Holder uses the effect - cannot vote today
        await AmuletService.updateAmulet(amulet.id, {
          holder_cannot_vote: true,
          must_pass_today: true, // Passes tomorrow
        });

        if (previousHolderTeam) {
          const teamDisplay = previousHolderTeam === 'alien' ? 'ALIEN' : 'CREW';
          Alert.alert(
            'Team Revealed',
            `The previous holder was on the ${teamDisplay} team.\n\nRemember: You cannot vote today.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(
            'No Previous Holder',
            'There was no previous holder to reveal.\n\nYou still cannot vote today.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        // Holder skips the effect -> destroy immediately (no reveal)
        await AmuletService.updateAmulet(amulet.id, {
          holder_cannot_vote: false,
          must_pass_today: false,
          is_used: true,
          used_at: new Date().toISOString(),
        });
        Alert.alert(
          'Effect Skipped',
          'You chose not to use the Resonance Tracker effect. The amulet has been destroyed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error processing Resonance Tracker choice:', error);
      Alert.alert('Error', 'Failed to process your choice');
    } finally {
      setProcessing(false);
    }
  };

  const handleNeuralImplantConfirm = async () => {
    if (!amulet || !selectedTargetId || !amulet.current_holder_id) return;
    setProcessing(true);

    try {
      await AmuletService.useNeuralImplant({
        amuletId: amulet.id,
        holderId: amulet.current_holder_id,
        targetId: selectedTargetId,
        gameId: game_id,
      });

      const targetPlayer = players.find((p) => p.id === selectedTargetId);
      Alert.alert(
        'Target Selected',
        `You have selected ${targetPlayer?.username || 'Unknown'}.\n\nIf you survive until tomorrow, their role will be revealed to you.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error using Neural Implant:', error);
      Alert.alert('Error', 'Failed to process your selection');
    } finally {
      setProcessing(false);
    }
  };

  const handleBioScannerScan = async () => {
    if (!amulet || !scanTargetId || !amulet.current_holder_id) return;
    setProcessing(true);

    try {
      const result = await AmuletService.useBioScanner({
        amuletId: amulet.id,
        scannerId: amulet.current_holder_id,
        targetId: scanTargetId,
        players,
      });

      setScanResult(result.result);
    } catch (error) {
      console.error('Error using Bio Scanner:', error);
      Alert.alert('Error', 'Failed to perform scan');
    } finally {
      setProcessing(false);
    }
  };

  const handleBioScannerDone = () => {
    navigation.goBack();
  };

  const handleEchoBeaconAcknowledge = () => {
    Alert.alert(
      'Echo Beacon',
      'The moderator will ask you about your neighbors\' night activity. Wait for their instructions.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading amulet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!amulet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Amulet not found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const amuletInfo = AMULET_INFO[amulet.amulet_type] || {
    name: 'Unknown Amulet',
    icon: '❓',
    description: 'Unknown amulet type.',
  };

  // Render amulet-specific UI
  const renderAmuletUI = () => {
    switch (amulet.amulet_type) {
      case 'shielding_device':
        return renderShieldingDeviceUI();
      case 'resonance_tracker':
        return renderResonanceTrackerUI();
      case 'neural_implant':
        return renderNeuralImplantUI();
      case 'bio_scanner':
        return renderBioScannerUI();
      case 'echo_beacon':
        return renderEchoBeaconUI();
      default:
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardText}>Unknown amulet type. Contact the moderator.</Text>
            </Card.Content>
          </Card>
        );
    }
  };

  const renderShieldingDeviceUI = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Choose Your Action</Text>
        <Text style={styles.cardText}>
          You are protected from elimination today and tonight. What happens after?
        </Text>

        <RadioButton.Group onValueChange={(v) => setShieldChoice(v as 'pass' | 'destroy')} value={shieldChoice}>
          <View style={styles.radioOption}>
            <RadioButton.Android value="pass" color={darkTheme.colors.primary} />
            <View style={styles.radioContent}>
              <Text style={styles.radioLabel}>Pass to another player</Text>
              <Text style={styles.radioDescription}>
                Tomorrow, the Shielding Device will be randomly assigned to another alive player.
              </Text>
            </View>
          </View>

          <View style={styles.radioOption}>
            <RadioButton.Android value="destroy" color={darkTheme.colors.primary} />
            <View style={styles.radioContent}>
              <Text style={styles.radioLabel}>Destroy after tonight</Text>
              <Text style={styles.radioDescription}>
                The Shielding Device will be destroyed after tonight and removed from the game.
              </Text>
            </View>
          </View>
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleShieldingDeviceConfirm}
          loading={processing}
          disabled={processing}
          style={styles.confirmButton}
        >
          Confirm Choice
        </Button>
      </Card.Content>
    </Card>
  );

  const renderResonanceTrackerUI = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Use Resonance Tracker Effect?</Text>
        <Text style={styles.cardText}>
          You can learn the previous holder's team, but you will lose your vote today.
        </Text>

        <RadioButton.Group onValueChange={(v) => setResonanceChoice(v as 'use' | 'skip')} value={resonanceChoice}>
          <View style={styles.radioOption}>
            <RadioButton.Android value="use" color={darkTheme.colors.primary} />
            <View style={styles.radioContent}>
              <Text style={styles.radioLabel}>Use effect (lose vote)</Text>
              <Text style={styles.radioDescription}>
                {previousHolderTeam
                  ? 'Reveal the previous holder\'s team. You cannot vote today.'
                  : 'No previous holder exists. You still cannot vote if you choose this.'}
              </Text>
            </View>
          </View>

          <View style={styles.radioOption}>
            <RadioButton.Android value="skip" color={darkTheme.colors.primary} />
            <View style={styles.radioContent}>
              <Text style={styles.radioLabel}>Skip effect (keep vote)</Text>
              <Text style={styles.radioDescription}>
                Don't reveal the team. You can vote today. The amulet passes tomorrow.
              </Text>
            </View>
          </View>
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleResonanceTrackerConfirm}
          loading={processing}
          disabled={processing}
          style={styles.confirmButton}
        >
          Confirm Choice
        </Button>
      </Card.Content>
    </Card>
  );

  const renderNeuralImplantUI = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Select a Target</Text>
        <Text style={styles.cardText}>
          Choose a player to learn their role TOMORROW. You must survive the night for the reveal.
        </Text>

        <View style={styles.playerList}>
          {alivePlayers
            .filter((p) => p.id !== amulet?.current_holder_id)
            .map((player) => (
              <List.Item
                key={player.id}
                title={player.username}
                left={() => (
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerInitial}>{player.username.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                right={() => (
                  <RadioButton.Android
                    value={player.id}
                    status={selectedTargetId === player.id ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedTargetId(player.id)}
                    color={darkTheme.colors.primary}
                  />
                )}
                onPress={() => setSelectedTargetId(player.id)}
                style={[
                  styles.playerItem,
                  selectedTargetId === player.id && styles.playerItemSelected,
                ]}
              />
            ))}
        </View>

        <Button
          mode="contained"
          onPress={handleNeuralImplantConfirm}
          loading={processing}
          disabled={processing || !selectedTargetId}
          style={styles.confirmButton}
        >
          Confirm Selection
        </Button>
      </Card.Content>
    </Card>
  );

  const renderBioScannerUI = () => {
    if (scanResult) {
      // Show scan result
      const isAlien = scanResult === 'Alien' || (scanResult !== 'Crew' && scanResult !== 'Alien');
      // If result is exact role name (for alien scanners), check if it indicates alien team
      const resultColor = scanResult === 'Alien' ? appColors.alien : scanResult === 'Crew' ? appColors.crew : darkTheme.colors.primary;

      return (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Scan Result</Text>
            <View style={styles.scanResultContainer}>
              <Text style={styles.scanResultLabel}>
                {players.find((p) => p.id === scanTargetId)?.username || 'Target'}
              </Text>
              <Text style={[styles.scanResultValue, { color: resultColor }]}>
                {scanResult}
              </Text>
            </View>
            <Text style={styles.cardText}>
              The Bio Scanner has been used and is now destroyed.
            </Text>
            <Button mode="contained" onPress={handleBioScannerDone} style={styles.confirmButton}>
              Done
            </Button>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Select a Player to Scan</Text>
          <Text style={styles.cardText}>
            Choose any player to scan. The result depends on your team:
            {'\n'}- Crew: See their team (Crew/Alien)
            {'\n'}- Alien: See their exact role
          </Text>

          <View style={styles.playerList}>
            {alivePlayers
              .filter((p) => p.id !== amulet?.current_holder_id)
              .map((player) => (
                <List.Item
                  key={player.id}
                  title={player.username}
                  left={() => (
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerInitial}>{player.username.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  right={() => (
                    <RadioButton.Android
                      value={player.id}
                      status={scanTargetId === player.id ? 'checked' : 'unchecked'}
                      onPress={() => setScanTargetId(player.id)}
                      color={darkTheme.colors.primary}
                    />
                  )}
                  onPress={() => setScanTargetId(player.id)}
                  style={[
                    styles.playerItem,
                    scanTargetId === player.id && styles.playerItemSelected,
                  ]}
                />
              ))}
          </View>

          <Button
            mode="contained"
            onPress={handleBioScannerScan}
            loading={processing}
            disabled={processing || !scanTargetId}
            style={styles.confirmButton}
          >
            Scan Player
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderEchoBeaconUI = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Echo Beacon Received</Text>
        <Text style={styles.cardText}>
          The Echo Beacon detects night activity from your neighbors.
          {'\n\n'}
          This is a moderator-handled amulet. The moderator will:
          {'\n'}1. Ask you who your physical left and right neighbors are
          {'\n'}2. Tell you which of them used a night ability
          {'\n\n'}
          Wait for the moderator's instructions.
        </Text>

        <Button mode="contained" onPress={handleEchoBeaconAcknowledge} style={styles.confirmButton}>
          I Understand
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.amuletIcon}>{amuletInfo.icon}</Text>
          <Text style={styles.title}>{amuletInfo.name}</Text>
          <Text style={styles.subtitle}>{amuletInfo.description}</Text>
        </View>

        {/* Amulet-specific UI */}
        {renderAmuletUI()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 18,
    color: darkTheme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  amuletIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
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
  cardText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  radioContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  radioDescription: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  playerList: {
    marginBottom: spacing.md,
  },
  playerItem: {
    borderRadius: 8,
    marginBottom: spacing.xs,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  playerItemSelected: {
    backgroundColor: darkTheme.colors.primaryContainer,
    borderWidth: 1,
    borderColor: darkTheme.colors.primary,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  playerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.background,
  },
  confirmButton: {
    marginTop: spacing.md,
    borderRadius: 4,
  },
  scanResultContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  scanResultLabel: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  scanResultValue: {
    fontSize: 32,
    fontWeight: '700',
  },
});

export default AmuletReceivedScreen;
