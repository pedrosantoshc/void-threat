import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, List, Divider, Chip } from 'react-native-paper';
import { GamePlayer, NightAction } from '../types';
import { darkTheme, spacing, appColors } from '../constants/theme';
import { ROLES } from '../constants/roles';
import { supabase } from '../config/supabase';

type ActionType = 'scan' | 'protect' | 'silence' | 'kill' | 'heal' | 'hunt';

interface NightActionModalProps {
  visible: boolean;
  onClose: () => void;
  actor: GamePlayer;
  players: GamePlayer[];
  gameId: string;
  nightNumber: number;
  onActionRecorded: (action: NightAction) => void;
}

interface ActionConfig {
  type: ActionType;
  icon: string;
  title: string;
  description: string;
  allowMultipleTargets?: boolean;
  maxTargets?: number;
  canTargetSelf?: boolean;
  excludeTeam?: 'crew' | 'alien';
  resultRequired?: boolean;
}

const getActionConfig = (role: string): ActionConfig | null => {
  const roleData = ROLES[role];
  if (!roleData?.night_action) return null;

  switch (role) {
    case 'bioscanner':
    case 'junior_scanner':
    case 'dna_tracker':
      return {
        type: 'scan',
        icon: '🔬',
        title: 'Scan Player',
        description: 'Learn if the target is Alien or Crew (yes/no).',
        canTargetSelf: false,
        resultRequired: true,
      };
    case 'detective':
      return {
        type: 'scan',
        icon: '🔍',
        title: 'Inspect Adjacent',
        description: 'Inspect 3 adjacent players. Any alien among them?',
        allowMultipleTargets: true,
        maxTargets: 3,
        canTargetSelf: false,
        resultRequired: true,
      };
    case 'alien_scanner':
      return {
        type: 'scan',
        icon: '👁️',
        title: 'Alien Scan',
        description: 'Scan privately. Is target Alien? Is target Bioscanner?',
        canTargetSelf: false,
        resultRequired: true,
      };
    case 'watchman':
      return {
        type: 'protect',
        icon: '🛡️',
        title: 'Protect Player',
        description: 'Protect target from alien night kills.',
        canTargetSelf: true,
      };
    case 'ship_doctor':
      return {
        type: 'protect',
        icon: '🩺',
        title: 'Day Protection',
        description: 'Protect target from day elimination tomorrow.',
        canTargetSelf: true,
      };
    case 'scientist':
      return {
        type: 'heal', // or 'kill' - scientist chooses
        icon: '🧪',
        title: 'Scientist Action',
        description: 'Choose: Heal or Kill (once each per game).',
        canTargetSelf: false,
      };
    case 'silencer':
      return {
        type: 'silence',
        icon: '🤫',
        title: 'Silence Player',
        description: 'Target cannot speak or vote next day.',
        canTargetSelf: false,
      };
    case 'alien':
    case 'alien_pup':
    case 'rogue_alien':
      return {
        type: 'kill',
        icon: '💀',
        title: 'Alien Kill',
        description: 'Collectively choose crew member to kill.',
        canTargetSelf: false,
        excludeTeam: 'alien',
      };
    case 'predator':
      return {
        type: 'hunt',
        icon: '🎯',
        title: 'Hunt Target',
        description: 'If Alien: dies. If Crew: nothing happens.',
        canTargetSelf: false,
        resultRequired: true,
      };
    default:
      return null;
  }
};

const NightActionModal: React.FC<NightActionModalProps> = ({
  visible,
  onClose,
  actor,
  players,
  gameId,
  nightNumber,
  onActionRecorded,
}) => {
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => getActionConfig(actor.role), [actor.role]);

  const availablePlayers = useMemo(() => {
    return players.filter((p) => {
      if (!p.is_alive) return false;
      if (!config?.canTargetSelf && p.id === actor.id) return false;
      if (config?.excludeTeam && p.team === config.excludeTeam) return false;
      return true;
    });
  }, [players, actor.id, config]);

  const canSubmit = useMemo(() => {
    if (!config) return false;
    if (selectedTargetIds.length === 0) return false;
    if (config.allowMultipleTargets && config.maxTargets && selectedTargetIds.length !== config.maxTargets) return false;
    if (config.resultRequired && !result) return false;
    return true;
  }, [config, selectedTargetIds, result]);

  const toggleTarget = (playerId: string) => {
    if (!config) return;

    if (config.allowMultipleTargets) {
      if (selectedTargetIds.includes(playerId)) {
        setSelectedTargetIds(selectedTargetIds.filter((id) => id !== playerId));
      } else if (!config.maxTargets || selectedTargetIds.length < config.maxTargets) {
        setSelectedTargetIds([...selectedTargetIds, playerId]);
      }
    } else {
      setSelectedTargetIds([playerId]);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !config) return;
    setProcessing(true);
    setError(null);

    try {
      const actionData: Omit<NightAction, 'id' | 'created_at'> = {
        game_id: gameId,
        night_number: nightNumber,
        role: actor.role,
        action_type: config.type,
        actor_id: actor.id,
        target_id: config.allowMultipleTargets ? undefined : selectedTargetIds[0],
        target_ids: config.allowMultipleTargets ? selectedTargetIds : undefined,
        result: result || undefined,
      };

      const { data, error: insertError } = await supabase
        .from('night_actions')
        .insert(actionData)
        .select()
        .single();

      if (insertError) throw insertError;

      onActionRecorded(data as NightAction);
      handleClose();
    } catch (err) {
      console.error('Error recording action:', err);
      setError(String((err as any)?.message || 'Failed to record action'));
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedTargetIds([]);
    setResult(null);
    setError(null);
    onClose();
  };

  if (!config) {
    return (
      <Modal visible={visible} transparent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>No Night Action</Text>
              <Text style={styles.instructions}>
                {actor.username} ({ROLES[actor.role]?.name || actor.role}) has no night action.
              </Text>
              <Button mode="contained" onPress={handleClose}>
                Close
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

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
              <Text style={styles.icon}>{config.icon}</Text>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>Night {nightNumber}</Text>
            </View>

            <Divider style={styles.headerDivider} />

            {/* Actor Info */}
            <View style={styles.actorInfo}>
              <Text style={styles.actorLabel}>Player:</Text>
              <Text style={styles.actorName}>{actor.username}</Text>
              <Chip style={styles.roleChip}>{ROLES[actor.role]?.name || actor.role}</Chip>
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>{config.description}</Text>

            {/* Target Selection */}
            <Card style={styles.selectionCard}>
              <Card.Content>
                <Text style={styles.selectionTitle}>
                  {config.allowMultipleTargets
                    ? `Select ${config.maxTargets} Players`
                    : 'Select Target'}
                </Text>
                <ScrollView style={styles.playerScroll} nestedScrollEnabled>
                  {availablePlayers.map((player) => {
                    const isSelected = selectedTargetIds.includes(player.id);
                    return (
                      <List.Item
                        key={player.id}
                        title={player.username}
                        left={() => (
                          <RadioButton.Android
                            value={player.id}
                            status={isSelected ? 'checked' : 'unchecked'}
                            onPress={() => toggleTarget(player.id)}
                            color={darkTheme.colors.primary}
                          />
                        )}
                        onPress={() => toggleTarget(player.id)}
                        style={[
                          styles.playerItem,
                          isSelected && styles.playerItemSelected,
                        ]}
                      />
                    );
                  })}
                </ScrollView>
                {config.allowMultipleTargets && (
                  <Text style={styles.selectionCount}>
                    Selected: {selectedTargetIds.length}/{config.maxTargets}
                  </Text>
                )}
              </Card.Content>
            </Card>

            {/* Result Input (for scan actions) */}
            {config.resultRequired && selectedTargetIds.length > 0 && (
              <Card style={styles.resultCard}>
                <Card.Content>
                  <Text style={styles.selectionTitle}>Result</Text>
                  <View style={styles.resultRow}>
                    <Button
                      mode={result === 'yes' ? 'contained' : 'outlined'}
                      onPress={() => setResult('yes')}
                      style={styles.resultButton}
                    >
                      Yes / Alien
                    </Button>
                    <Button
                      mode={result === 'no' ? 'contained' : 'outlined'}
                      onPress={() => setResult('no')}
                      style={styles.resultButton}
                    >
                      No / Crew
                    </Button>
                  </View>
                </Card.Content>
              </Card>
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
                disabled={!canSubmit || processing}
                loading={processing}
                style={styles.button}
              >
                Record Action
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
  actorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
    gap: spacing.sm,
  },
  actorLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  actorName: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  roleChip: {
    backgroundColor: darkTheme.colors.primaryContainer,
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
    maxHeight: 180,
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
  selectionCount: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  resultCard: {
    backgroundColor: darkTheme.colors.background,
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultButton: {
    flex: 1,
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

export default NightActionModal;
