import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Card, RadioButton, List, Divider } from 'react-native-paper';
import { GamePlayer, Link } from '../types';
import { darkTheme, spacing, appColors } from '../constants/theme';
import { GameService } from '../services/gameService';

type LinkType = 'cupid' | 'parasyte' | 'clone';

interface LinkCreationModalProps {
  visible: boolean;
  onClose: () => void;
  linkType: LinkType;
  actorPlayer: GamePlayer;
  players: GamePlayer[];
  gameId: string;
  onLinkCreated: (link: Link) => void;
}

const LINK_CONFIG: Record<LinkType, {
  title: string;
  icon: string;
  description: string;
  requiresTwoTargets: boolean;
  canTargetSelf: boolean;
}> = {
  cupid: {
    title: 'Cupid Link',
    icon: '💘',
    description: 'Select two players to link. If one dies, the other dies too.',
    requiresTwoTargets: true,
    canTargetSelf: false,
  },
  parasyte: {
    title: 'Parasyte Link',
    icon: '🦠',
    description: 'Select a host player. If the host dies, you survive. If you die, the host dies too.',
    requiresTwoTargets: false,
    canTargetSelf: false,
  },
  clone: {
    title: 'Clone Target',
    icon: '🧬',
    description: 'Select a player to clone. If they die, you become their role.',
    requiresTwoTargets: false,
    canTargetSelf: false,
  },
};

const LinkCreationModal: React.FC<LinkCreationModalProps> = ({
  visible,
  onClose,
  linkType,
  actorPlayer,
  players,
  gameId,
  onLinkCreated,
}) => {
  const [target1Id, setTarget1Id] = useState<string | null>(null);
  const [target2Id, setTarget2Id] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = LINK_CONFIG[linkType];

  const availablePlayers = useMemo(() => {
    return players.filter((p) => {
      if (!p.is_alive) return false;
      if (!config.canTargetSelf && p.id === actorPlayer.id) return false;
      return true;
    });
  }, [players, actorPlayer.id, config.canTargetSelf]);

  // For Cupid: filter second target list to exclude first target
  const target2Players = useMemo(() => {
    if (!config.requiresTwoTargets) return [];
    return availablePlayers.filter((p) => p.id !== target1Id);
  }, [availablePlayers, target1Id, config.requiresTwoTargets]);

  const canSubmit = useMemo(() => {
    if (config.requiresTwoTargets) {
      return target1Id && target2Id && target1Id !== target2Id;
    }
    return !!target1Id;
  }, [target1Id, target2Id, config.requiresTwoTargets]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    setError(null);

    try {
      let link: Link;

      if (linkType === 'cupid') {
        // Cupid links two OTHER players (not themselves)
        link = await GameService.createGameLink(gameId, 'cupid', target1Id!, target2Id!);
      } else if (linkType === 'parasyte') {
        // Parasyte: player1 is parasyte (actor), player2 is host (target)
        link = await GameService.createGameLink(gameId, 'parasyte', actorPlayer.id, target1Id!);
      } else {
        // Clone: player1 is clone (actor), stores target as player2
        link = await GameService.createGameLink(gameId, 'clone', actorPlayer.id, target1Id!);
      }

      onLinkCreated(link);
      handleClose();
    } catch (err) {
      console.error('Error creating link:', err);
      setError(String((err as any)?.message || 'Failed to create link'));
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setTarget1Id(null);
    setTarget2Id(null);
    setError(null);
    onClose();
  };

  const renderPlayerList = (
    selectedId: string | null,
    onSelect: (id: string) => void,
    playerList: GamePlayer[],
    label: string
  ) => (
    <Card style={styles.selectionCard}>
      <Card.Content>
        <Text style={styles.selectionTitle}>{label}</Text>
        <ScrollView style={styles.playerScroll} nestedScrollEnabled>
          {playerList.map((player) => (
            <List.Item
              key={player.id}
              title={player.username}
              description={linkType === 'cupid' ? undefined : player.role}
              left={() => (
                <RadioButton.Android
                  value={player.id}
                  status={selectedId === player.id ? 'checked' : 'unchecked'}
                  onPress={() => onSelect(player.id)}
                  color={darkTheme.colors.primary}
                />
              )}
              onPress={() => onSelect(player.id)}
              style={[
                styles.playerItem,
                selectedId === player.id && styles.playerItemSelected,
              ]}
            />
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
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
              <Text style={styles.icon}>{config.icon}</Text>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>Night 1 Action</Text>
            </View>

            <Divider style={styles.headerDivider} />

            {/* Actor Info */}
            <View style={styles.actorInfo}>
              <Text style={styles.actorLabel}>Player:</Text>
              <Text style={styles.actorName}>{actorPlayer.username}</Text>
            </View>

            {/* Instructions */}
            <Text style={styles.instructions}>{config.description}</Text>

            {/* Target Selection */}
            {renderPlayerList(
              target1Id,
              setTarget1Id,
              availablePlayers,
              config.requiresTwoTargets ? 'First Player' : 'Select Target'
            )}

            {config.requiresTwoTargets && target1Id && (
              renderPlayerList(
                target2Id,
                setTarget2Id,
                target2Players,
                'Second Player'
              )
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
                Create Link
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
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: darkTheme.colors.surfaceVariant,
    borderRadius: 8,
  },
  actorLabel: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  actorName: {
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
});

export default LinkCreationModal;
