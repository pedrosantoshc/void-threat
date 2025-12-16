import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Card, Text } from 'react-native-paper';

import { NavigationStackParamList, GameSession, GamePlayer } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { GameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';
import { assignCustomRoles, assignStandardRoles, shuffleRoles } from '../utils/roleAssignment';

type Props = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Lobby'>;
  route: RouteProp<NavigationStackParamList, 'Lobby'>;
};

export default function LobbyScreen({ navigation, route }: Props) {
  const { game_id } = route.params;
  const { current_game, setCurrentGame, setPlayers } = useGameStore();

  const [game, setGame] = useState<GameSession | null>(current_game?.id === game_id ? current_game : null);
  const [players, setPlayersLocal] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let unsubscribe: undefined | (() => void);

    (async () => {
      try {
        const fetched = await GameService.getGameSession(game_id);
        if (fetched) {
          setGame(fetched);
          setCurrentGame(fetched);
        }

        const currentPlayers = await GameService.getGamePlayers(game_id);
        setPlayersLocal(currentPlayers);

        unsubscribe = GameService.subscribeToGameUpdates(
          game_id,
          (g) => {
            setGame(g);
            setCurrentGame(g);
          },
          (p) => setPlayersLocal(p)
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [game_id]);

  const target = game?.max_players ?? 8;
  const ready = players.length === target && players.length > 0;

  const mode = game?.game_mode ?? 'standard';
  const hasCustom = !!(game as any)?.custom_roles && Object.keys((game as any).custom_roles || {}).length > 0;

  const canAssign = useMemo(() => {
    if (!game) return false;
    if (mode === 'custom') return hasCustom;
    return true;
  }, [game, mode, hasCustom]);

  const handleShare = async () => {
    if (!game) return;
    const msg = `Join my Void Threat game: ${game.game_url}\nCode: ${game.game_code}`;
    await Share.share({ message: msg });
  };

  const handleAssignAndStart = async () => {
    if (!game) return;
    if (!ready) {
      Alert.alert('Not ready', `Waiting for players: ${players.length}/${target}`);
      return;
    }
    if (!canAssign) {
      Alert.alert('Custom setup missing', 'Go back and configure custom roles first.');
      return;
    }

    try {
      setStarting(true);

      // Refresh players in correct order
      const currentPlayers = await GameService.getGamePlayers(game.id);

      const assignment =
        mode === 'custom'
          ? assignCustomRoles(((game as any).custom_roles || {}) as Record<string, number>)
          : assignStandardRoles(target);

      if (assignment.roles.length !== currentPlayers.length) {
        Alert.alert(
          'Player Count Mismatch',
          `Configured ${assignment.roles.length} roles but found ${currentPlayers.length} players.`
        );
        return;
      }

      const shuffled = shuffleRoles(assignment.roles);
      const roleAssignments = currentPlayers.map((p, idx) => ({
        playerId: p.id,
        role: shuffled[idx].role,
        team: shuffled[idx].team,
      }));

      const updatedPlayers = await GameService.assignRolesToPlayers(game.id, roleAssignments);
      setPlayers(updatedPlayers);

      await GameService.startGame(game.id);

      Alert.alert('Game started', 'Roles assigned. Night phase begins now.');
      navigation.navigate('NightPhase', { game_id: game.id, night_number: 1 });
    } catch (e) {
      Alert.alert('Failed to start', String((e as any)?.message || e));
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lobby</Text>
        <Text style={styles.subtitle}>Waiting for players to join…</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Game Code</Text>
            <Text style={styles.code}>{game?.game_code || '—'}</Text>
            <Text style={styles.small}>{game?.game_url || ''}</Text>
            <Button mode="outlined" onPress={handleShare} style={styles.shareBtn} disabled={!game}>
              Share
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Players</Text>
            <Text style={styles.count}>
              {loading ? 'Loading…' : `${players.length} / ${target}`}
            </Text>
            <Text style={styles.small}>
              {ready ? 'All players joined. You can start.' : 'Ask players to join using the code or QR.'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleAssignAndStart}
            disabled={!ready || !canAssign || starting}
            loading={starting}
            style={styles.primaryBtn}
          >
            Assign Roles & Start Game
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()}>
            Back
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.colors.background },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: darkTheme.colors.primary, textAlign: 'center' },
  subtitle: { color: darkTheme.colors.onSurfaceVariant, textAlign: 'center' },
  card: { backgroundColor: darkTheme.colors.surface },
  cardTitle: { fontWeight: '800', color: darkTheme.colors.onSurface, marginBottom: spacing.xs },
  code: { fontSize: 32, fontWeight: '900', color: darkTheme.colors.onSurface, textAlign: 'center' },
  count: { fontSize: 28, fontWeight: '900', color: darkTheme.colors.onSurface, textAlign: 'center' },
  small: { color: darkTheme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs },
  shareBtn: { marginTop: spacing.md, borderColor: darkTheme.colors.primary },
  actions: { marginTop: 'auto', gap: spacing.sm },
  primaryBtn: { backgroundColor: darkTheme.colors.primary },
});


