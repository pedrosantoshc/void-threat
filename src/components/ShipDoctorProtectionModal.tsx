import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, List, Divider } from 'react-native-paper';
import { GamePlayer, NightAction } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { supabase } from '../config/supabase';

interface ShipDoctorProtectionModalProps {
  visible: boolean;
  onClose: () => void;
  shipDoctor: GamePlayer;
  players: GamePlayer[];
  gameId: string;
  nightNumber: number;
  onProtectionSet: (targetId: string) => void;
}

const ShipDoctorProtectionModal: React.FC<ShipDoctorProtectionModalProps> = ({
  visible,
  onClose,
  shipDoctor,
  players,
  gameId,
  nightNumber,
  onProtectionSet,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ship Doctor can protect self (PRD EC2)
  const availablePlayers = useMemo(() => {
    return players.filter((p) => p.is_alive);
  }, [players]);

  const handleSubmit = async () => {
    if (!selectedTargetId) return;
    setProcessing(true);
    setError(null);

    try {
      // Record the protection as a night action
      const { error: insertError } = await supabase.from('night_actions').insert({
        game_id: gameId,
        night_number: nightNumber,
        role: 'ship_doctor',
        action_type: 'protect',
        actor_id: shipDoctor.id,
        target_id: selectedTargetId,
      });

      if (insertError) throw insertError;

      onProtectionSet(selectedTargetId);
      handleClose();
    } catch (err) {
      console.error('Error setting protection:', err);
      setError(String((err as any)?.message || 'Failed to set protection'));
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedTargetId(null);
    setError(null);
    onClose();
  };

  const getTargetName = (id: string): string => {
    const player = players.find((p) => p.id === id);
    return player?.username || 'Unknown';
  };

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
              <Text style={styles.icon}>🩺</Text>
              <Text style={styles.title}>Ship Doctor</Text>
              <Text style={styles.subtitle}>Night {nightNumber} Protection</Text>
            </View>

            <Divider style={styles.headerDivider} />

            {/* Doctor Info */}
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorLabel}>Doctor:</Text>
              <Text style={styles.doctorName}>{shipDoctor.username}</Text>
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>
              Ask the Ship Doctor who they want to protect tonight.
              {'\n\n'}
              The protected player will survive any day elimination tomorrow.
              Ship Doctor can protect themselves (PRD EC2).
            </Text>

            {/* Target Selection */}
            <Card style={styles.selectionCard}>
              <Card.Content>
                <Text style={styles.selectionTitle}>Select Player to Protect</Text>
                <ScrollView style={styles.playerScroll} nestedScrollEnabled>
                  {availablePlayers.map((player) => (
                    <List.Item
                      key={player.id}
                      title={player.username}
                      description={player.id === shipDoctor.id ? '(Self)' : undefined}
                      left={() => (
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
                </ScrollView>
              </Card.Content>
            </Card>

            {/* Selected Preview */}
            {selectedTargetId && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Will protect:</Text>
                <Text style={styles.previewName}>{getTargetName(selectedTargetId)}</Text>
              </View>
            )}

            {/* Error Display */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={handleClose} style={styles.button}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={!selectedTargetId || processing}
                loading={processing}
                style={styles.button}
              >
                Confirm Protection
              </Button>
            </View>
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
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  doctorLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  doctorName: {
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
    maxHeight: 200,
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
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: darkTheme.colors.primaryContainer,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontSize: 14,
    color: darkTheme.colors.onPrimaryContainer,
    marginRight: spacing.sm,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onPrimaryContainer,
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
});

export default ShipDoctorProtectionModal;
