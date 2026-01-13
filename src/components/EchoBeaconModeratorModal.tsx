import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, List, Divider } from 'react-native-paper';
import { GamePlayer, Amulet, NightAction } from '../types';
import { darkTheme, spacing, appColors } from '../constants/theme';
import { AmuletService } from '../services/amuletService';

interface EchoBeaconModeratorModalProps {
  visible: boolean;
  onClose: () => void;
  amulet: Amulet;
  players: GamePlayer[];
  nightActions: NightAction[];
  onAmuletUsed: () => void;
}

interface NeighborResult {
  playerId: string;
  playerName: string;
  acted: boolean;
}

const EchoBeaconModeratorModal: React.FC<EchoBeaconModeratorModalProps> = ({
  visible,
  onClose,
  amulet,
  players,
  nightActions,
  onAmuletUsed,
}) => {
  const [leftNeighborId, setLeftNeighborId] = useState<string | null>(null);
  const [rightNeighborId, setRightNeighborId] = useState<string | null>(null);
  const [results, setResults] = useState<NeighborResult[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'results'>('select');

  const holder = useMemo(() => {
    return players.find((p) => p.id === amulet.current_holder_id);
  }, [players, amulet.current_holder_id]);

  const alivePlayers = useMemo(() => {
    return players.filter((p) => p.is_alive && p.id !== amulet.current_holder_id);
  }, [players, amulet.current_holder_id]);

  const canCheckActions = leftNeighborId && rightNeighborId && leftNeighborId !== rightNeighborId;

  const handleCheckActions = async () => {
    if (!leftNeighborId || !rightNeighborId) return;
    setProcessing(true);

    try {
      // Check which neighbors performed night actions
      const neighborIds = [leftNeighborId, rightNeighborId];
      const neighborResults: NeighborResult[] = neighborIds.map((id) => {
        const player = players.find((p) => p.id === id);
        const acted = nightActions.some((a) => a.actor_id === id);
        return {
          playerId: id,
          playerName: player?.username || 'Unknown',
          acted,
        };
      });

      setResults(neighborResults);
      setStep('results');
    } catch (error) {
      console.error('Error checking neighbor actions:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsUsed = async () => {
    setProcessing(true);

    try {
      await AmuletService.updateAmulet(amulet.id, {
        is_used: true,
        used_at: new Date().toISOString(),
      });
      onAmuletUsed();
      handleClose();
    } catch (error) {
      console.error('Error marking Echo Beacon as used:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setLeftNeighborId(null);
    setRightNeighborId(null);
    setResults(null);
    setStep('select');
    onClose();
  };

  const handlePass = () => {
    // Just close without marking as used - Echo Beacon stays with holder for later use.
    handleClose();
  };

  const renderSelectStep = () => (
    <>
      <Text style={styles.instructions}>
        Ask {holder?.username || 'the holder'}: "Do you want to use the Echo Beacon effect?"
        {'\n\n'}
        If YES, ask them to identify their physical left and right neighbors.
      </Text>

      <Card style={styles.selectionCard}>
        <Card.Content>
          <Text style={styles.selectionTitle}>Left Neighbor</Text>
          <ScrollView style={styles.playerScroll} nestedScrollEnabled>
            {alivePlayers.map((player) => (
              <List.Item
                key={`left-${player.id}`}
                title={player.username}
                left={() => (
                  <RadioButton.Android
                    value={player.id}
                    status={leftNeighborId === player.id ? 'checked' : 'unchecked'}
                    onPress={() => setLeftNeighborId(player.id)}
                    color={darkTheme.colors.primary}
                  />
                )}
                onPress={() => setLeftNeighborId(player.id)}
                style={[
                  styles.playerItem,
                  leftNeighborId === player.id && styles.playerItemSelected,
                ]}
              />
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      <Card style={styles.selectionCard}>
        <Card.Content>
          <Text style={styles.selectionTitle}>Right Neighbor</Text>
          <ScrollView style={styles.playerScroll} nestedScrollEnabled>
            {alivePlayers.map((player) => (
              <List.Item
                key={`right-${player.id}`}
                title={player.username}
                left={() => (
                  <RadioButton.Android
                    value={player.id}
                    status={rightNeighborId === player.id ? 'checked' : 'unchecked'}
                    onPress={() => setRightNeighborId(player.id)}
                    color={darkTheme.colors.primary}
                  />
                )}
                onPress={() => setRightNeighborId(player.id)}
                style={[
                  styles.playerItem,
                  rightNeighborId === player.id && styles.playerItemSelected,
                ]}
              />
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {leftNeighborId === rightNeighborId && leftNeighborId !== null && (
        <Text style={styles.errorText}>Left and right neighbors must be different players.</Text>
      )}

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={handlePass} style={styles.button}>
          Not used tonight
        </Button>
        <Button
          mode="contained"
          onPress={handleCheckActions}
          disabled={!canCheckActions || processing}
          loading={processing}
          style={styles.button}
        >
          Check Actions
        </Button>
      </View>
    </>
  );

  const renderResultsStep = () => (
    <>
      <Text style={styles.instructions}>
        Results for {holder?.username || 'holder'}'s neighbors:
      </Text>

      <Card style={styles.resultsCard}>
        <Card.Content>
          {results?.map((result, index) => (
            <View key={result.playerId}>
              {index > 0 && <Divider style={styles.divider} />}
              <View style={styles.resultRow}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultLabel}>
                    {index === 0 ? 'Left Neighbor' : 'Right Neighbor'}
                  </Text>
                  <Text style={styles.resultName}>{result.playerName}</Text>
                </View>
                <View
                  style={[
                    styles.resultBadge,
                    result.acted ? styles.actedBadge : styles.noActionBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.resultBadgeText,
                      result.acted ? styles.actedText : styles.noActionText,
                    ]}
                  >
                    {result.acted ? 'ACTED' : 'NO ACTION'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Text style={styles.reminderText}>
        Tell {holder?.username || 'the holder'} these results verbally.
      </Text>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep('select')} style={styles.button}>
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleMarkAsUsed}
          loading={processing}
          disabled={processing}
          style={styles.button}
        >
          Mark as Used
        </Button>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.icon}>📻</Text>
              <Text style={styles.title}>Echo Beacon</Text>
              <Text style={styles.subtitle}>Moderator Action</Text>
            </View>

            <Divider style={styles.headerDivider} />

            {/* Holder Info */}
            <View style={styles.holderInfo}>
              <Text style={styles.holderLabel}>Holder:</Text>
              <Text style={styles.holderName}>{holder?.username || 'Unknown'}</Text>
            </View>

            {/* Step Content */}
            {step === 'select' ? renderSelectStep() : renderResultsStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  headerDivider: {
    backgroundColor: darkTheme.colors.outline,
    marginBottom: spacing.lg,
  },
  holderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  holderLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  holderName: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  instructions: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  selectionCard: {
    backgroundColor: darkTheme.colors.background,
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  playerScroll: {
    maxHeight: 150,
  },
  playerItem: {
    borderRadius: 4,
    marginBottom: spacing.xs,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  playerItemSelected: {
    backgroundColor: darkTheme.colors.primaryContainer,
    borderWidth: 1,
    borderColor: darkTheme.colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: darkTheme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: 4,
  },
  resultsCard: {
    backgroundColor: darkTheme.colors.background,
    marginBottom: spacing.lg,
    borderRadius: 8,
  },
  divider: {
    backgroundColor: darkTheme.colors.outline,
    marginVertical: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
  },
  resultBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  actedBadge: {
    backgroundColor: appColors.warning,
  },
  noActionBadge: {
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actedText: {
    color: '#000000',
  },
  noActionText: {
    color: darkTheme.colors.onSurfaceVariant,
  },
  reminderText: {
    fontSize: 14,
    color: darkTheme.colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});

export default EchoBeaconModeratorModal;
