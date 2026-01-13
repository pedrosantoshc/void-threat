import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Text } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { NavigationStackParamList, GameSession } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { GameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';

type Props = {
  navigation: StackNavigationProp<NavigationStackParamList, 'GameEnd'>;
  route: RouteProp<NavigationStackParamList, 'GameEnd'>;
};

function winnerLabel(winner?: string | null) {
  if (!winner) return 'Unknown';
  if (winner === 'crew') return 'Crew';
  if (winner === 'aliens') return 'Aliens';
  if (winner === 'predator') return 'Predator';
  if (winner === 'rogue_alien') return 'Rogue Alien';
  return winner;
}

export default function GameEndScreen({ navigation, route }: Props) {
  const { game_id } = route.params;
  const resetGame = useGameStore(s => s.resetGame);
  const current_game = useGameStore(s => s.current_game);

  const [game, setGame] = useState<GameSession | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const fetched = await GameService.getGameSession(game_id);
      if (mounted) setGame(fetched);
    })();
    return () => {
      mounted = false;
    };
  }, [game_id]);

  const winner = useMemo(() => {
    return (game?.winner ?? current_game?.winner) || null;
  }, [current_game?.winner, game?.winner]);

  const onBackToDashboard = () => {
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
          <Text style={styles.title}>GAME OVER</Text>
          <Text style={styles.subtitle}>Winner: {winnerLabel(winner)}</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.cardText}>Game ID: {game_id}</Text>
            <Text style={styles.cardText}>Result: {winnerLabel(winner)}</Text>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={onBackToDashboard}
            style={styles.primaryBtn}
            labelStyle={styles.primaryBtnText}
          >
            BACK TO DASHBOARD
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.colors.background },
  content: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: '700', color: darkTheme.colors.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: 16, color: darkTheme.colors.onSurfaceVariant },
  card: { backgroundColor: darkTheme.colors.surface, borderRadius: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: darkTheme.colors.onSurface, marginBottom: spacing.sm },
  cardText: { fontSize: 14, color: darkTheme.colors.onSurfaceVariant, marginBottom: spacing.xs },
  actions: { marginTop: 'auto' },
  primaryBtn: { backgroundColor: darkTheme.colors.primary, borderRadius: 4, paddingVertical: spacing.sm },
  primaryBtnText: { color: darkTheme.colors.background, fontWeight: '700' },
});


