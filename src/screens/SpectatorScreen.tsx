import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { NavigationStackParamList, GamePlayer, GameSession } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { GameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';
import type { NightResolutionResult, DayResolutionResult } from '../types/resolution';

type Props = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Spectator'>;
  route: RouteProp<NavigationStackParamList, 'Spectator'>;
};

export default function SpectatorScreen({ navigation, route }: Props) {
  const { game_id } = route.params;
  const { currentUser, current_player, setCurrentGame, setPlayers, resetGame } = useGameStore();

  const [game, setGame] = useState<GameSession | null>(null);
  const [players, setPlayersLocal] = useState<GamePlayer[]>([]);
  const [lastNight, setLastNight] = useState<NightResolutionResult | null>(null);
  const [lastDay, setLastDay] = useState<DayResolutionResult | null>(null);

  useEffect(() => {
    let unsubscribe: undefined | (() => void);

    (async () => {
      const fetched = await GameService.getGameSession(game_id);
      if (fetched) {
        setGame(fetched);
        setCurrentGame(fetched);
      }

      const currentPlayers = await GameService.getGamePlayers(game_id);
      setPlayersLocal(currentPlayers);
      setPlayers(currentPlayers);

      const [ln, ld] = await Promise.all([
        GameService.getLatestNightResolution(game_id).catch(() => null),
        GameService.getLatestDayResolution(game_id).catch(() => null),
      ]);
      setLastNight(ln);
      setLastDay(ld);

      unsubscribe = GameService.subscribeToGameUpdates(
        game_id,
        (g) => {
          setGame(g);
          setCurrentGame(g);
        },
        (p) => {
          setPlayersLocal(p);
          setPlayers(p);
        }
      );
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [game_id]);

  const aliveCount = useMemo(() => players.filter(p => p.is_alive).length, [players]);
  const total = players.length;

  const me = useMemo(() => {
    if (current_player?.id) return players.find(p => p.id === current_player.id) || null;
    if (currentUser?.is_guest && currentUser.guest_id) {
      return players.find(p => p.guest_id === currentUser.guest_id) || null;
    }
    if (currentUser?.id && !currentUser.is_guest) {
      return players.find(p => p.user_id === currentUser.id) || null;
    }
    return null;
  }, [currentUser?.guest_id, currentUser?.id, currentUser?.is_guest, current_player?.id, players]);

  const onLeave = async () => {
    resetGame();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }, { name: 'Dashboard' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>SPECTATOR MODE</Text>
          <Text style={styles.subtitle}>Read-only view</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Game</Text>
            <Text style={styles.line}>Code: {game?.game_code || '—'}</Text>
            <Text style={styles.line}>Status: {game?.status || '—'}</Text>
            <Text style={styles.line}>Phase: {game?.current_phase || '—'}</Text>
            <Text style={styles.line}>Alive: {aliveCount} / {total}</Text>
          </Card.Content>
        </Card>

        {me && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>You</Text>
              <Text style={styles.line}>Name: {me.username}</Text>
              <Text style={styles.line}>Alive: {me.is_alive ? 'Yes' : 'No'}</Text>
              {!me.is_alive && (
                <Text style={styles.small}>
                  You are eliminated, so you can only spectate.
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Players</Text>
            <Text style={styles.small}>
              Player list is visible; roles remain hidden.
            </Text>
            <View style={styles.playerList}>
              {players.map(p => (
                <View key={p.id} style={styles.playerRow}>
                  <Text style={styles.playerName}>{p.username}</Text>
                  <Text style={[styles.playerStatus, !p.is_alive && styles.playerDead]}>
                    {p.is_alive ? 'ALIVE' : 'DEAD'}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {(lastNight || lastDay) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Latest Summary</Text>
              {lastNight && (
                <>
                  <Text style={styles.line}>Night {lastNight.nightNumber}:</Text>
                  <Text style={styles.small}>
                    Deaths: {lastNight.deaths.length} · Silenced: {lastNight.silencedPlayers.length}
                  </Text>
                </>
              )}
              {lastDay && (
                <>
                  <Text style={[styles.line, { marginTop: spacing.sm }]}>Day {lastDay.dayNumber}:</Text>
                  <Text style={styles.small}>
                    Voted out: {lastDay.votedOutPlayer?.playerName || '—'} · Link deaths: {lastDay.linkDeaths.length}
                  </Text>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onLeave} style={styles.leaveBtn}>
            Leave
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.colors.background },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  header: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: darkTheme.colors.primary, textAlign: 'center' },
  subtitle: { color: darkTheme.colors.onSurfaceVariant, marginTop: spacing.xs },
  card: { backgroundColor: darkTheme.colors.surface },
  cardTitle: { fontWeight: '800', color: darkTheme.colors.onSurface, marginBottom: spacing.sm },
  line: { color: darkTheme.colors.onSurface, marginBottom: spacing.xs },
  small: { color: darkTheme.colors.onSurfaceVariant, marginTop: spacing.xs },
  playerList: { marginTop: spacing.sm, gap: spacing.xs },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  playerName: { color: darkTheme.colors.onSurface },
  playerStatus: { color: darkTheme.colors.primary, fontWeight: '800' },
  playerDead: { color: darkTheme.colors.outline },
  actions: { marginTop: 'auto' },
  leaveBtn: { borderColor: darkTheme.colors.primary },
});


