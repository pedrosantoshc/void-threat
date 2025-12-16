import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, IconButton, Text } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { ALIEN_ROLES, CREW_ROLES, INDEPENDENT_ROLES, ROLES, calculateBalanceScore } from '../constants/roles';
import { GameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';
import { MAX_PLAYERS, MIN_PLAYERS } from '../constants/game';

type Props = {
  navigation: StackNavigationProp<NavigationStackParamList, 'CustomGame'>;
  route: RouteProp<NavigationStackParamList, 'CustomGame'>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function onlyNonZero(counts: Record<string, number>) {
  return Object.fromEntries(Object.entries(counts).filter(([_, v]) => v > 0));
}

export default function CustomGameScreen({ navigation, route }: Props) {
  const { game_id } = route.params;
  const { current_game, setCurrentGame, setGameMode } = useGameStore();

  const [playerCount, setPlayerCount] = useState<number>(
    clamp(current_game?.max_players ?? 8, MIN_PLAYERS, MAX_PLAYERS)
  );

  const [roleCounts, setRoleCounts] = useState<Record<string, number>>(() => ({
    bioscanner: 1,
    alien: 1,
    crew_member: Math.max(0, (current_game?.max_players ?? 8) - 2),
  }));

  const totalSelected = useMemo(() => {
    return Object.values(roleCounts).reduce((sum, v) => sum + (v || 0), 0);
  }, [roleCounts]);

  const teamCounts = useMemo(() => {
    let crew = 0;
    let alien = 0;
    let independent = 0;
    for (const [roleKey, count] of Object.entries(roleCounts)) {
      if (!count) continue;
      const team = ROLES[roleKey]?.team;
      if (team === 'crew') crew += count;
      else if (team === 'alien') alien += count;
      else if (team === 'independent') independent += count;
    }
    return { crew, alien, independent };
  }, [roleCounts]);

  const alienSelected = useMemo(() => {
    return Object.entries(roleCounts).some(([k, v]) => v > 0 && ROLES[k]?.team === 'alien');
  }, [roleCounts]);

  const balance = useMemo(() => calculateBalanceScore(roleCounts), [roleCounts]);
  const remaining = playerCount - totalSelected;

  const isValid =
    playerCount >= MIN_PLAYERS &&
    playerCount <= MAX_PLAYERS &&
    totalSelected === playerCount &&
    alienSelected;

  const bumpRole = (roleKey: string, delta: number) => {
    setRoleCounts(prev => {
      const next = { ...prev };
      const curr = next[roleKey] ?? 0;
      next[roleKey] = Math.max(0, curr + delta);
      return next;
    });
  };

  const autoFillCrew = () => {
    setRoleCounts(prev => {
      const next = { ...prev };
      const total = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
      const needed = playerCount - total;
      next.crew_member = Math.max(0, (next.crew_member ?? 0) + needed);
      return next;
    });
  };

  const changePlayerCount = (delta: number) => {
    setPlayerCount(prev => clamp(prev + delta, MIN_PLAYERS, MAX_PLAYERS));
  };

  const onContinue = async () => {
    if (!isValid) {
      const why = [
        totalSelected !== playerCount ? `Select exactly ${playerCount} total roles.` : null,
        !alienSelected ? 'Include at least 1 Alien role.' : null,
      ]
        .filter(Boolean)
        .join('\n');
      Alert.alert('Invalid setup', why || 'Please fix the role selection.');
      return;
    }

    try {
      setGameMode('custom');
      const updates = await GameService.updateGameSession(game_id, {
        game_mode: 'custom',
        max_players: playerCount,
        custom_roles: onlyNonZero(roleCounts),
      } as any);

      setCurrentGame(updates);
      navigation.navigate('GameSetup', { game_id });
    } catch (e) {
      Alert.alert('Failed to save custom game', String((e as any)?.message || e));
    }
  };

  const renderRoleRow = (roleKey: string) => {
    const def = ROLES[roleKey];
    if (!def) return null;
    const count = roleCounts[roleKey] ?? 0;
    return (
      <View key={roleKey} style={styles.roleRow}>
        <View style={styles.roleInfo}>
          <Text style={styles.roleName}>{def.name}</Text>
          <Text style={styles.roleMeta}>
            {def.team.toUpperCase()} • Grade {def.grade > 0 ? `+${def.grade}` : def.grade}
          </Text>
        </View>

        <View style={styles.stepper}>
          <IconButton
            icon="minus"
            size={18}
            onPress={() => bumpRole(roleKey, -1)}
            disabled={count <= 0}
          />
          <Text style={styles.count}>{count}</Text>
          <IconButton icon="plus" size={18} onPress={() => bumpRole(roleKey, +1)} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <View style={styles.sticky}>
          <Text style={styles.stickyTitle}>Live Setup</Text>
          <View style={styles.stickyRow}>
            <Text style={styles.stickyText}>Selected: {totalSelected}/{playerCount}</Text>
            <Text style={styles.stickyText}>Remaining: {remaining}</Text>
          </View>
          <View style={styles.stickyRow}>
            <Text style={styles.stickyText}>Crew: {teamCounts.crew}</Text>
            <Text style={styles.stickyText}>Aliens: {teamCounts.alien}</Text>
            <Text style={styles.stickyText}>Indep: {teamCounts.independent}</Text>
          </View>
          <View style={styles.stickyRow}>
            <Text style={styles.stickyText}>
              Balance: {balance.total_score > 0 ? `+${balance.total_score}` : balance.total_score}
            </Text>
            <Text style={[styles.stickyText, !isValid && styles.stickyWarn]}>
              {isValid ? 'Valid' : 'Fix setup'}
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Custom Game</Text>
          <Text style={styles.subtitle}>Pick roles and balance your session</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Player Count</Text>
            <View style={styles.playerCountRow}>
              <IconButton icon="minus" onPress={() => changePlayerCount(-1)} disabled={playerCount <= MIN_PLAYERS} />
              <Text style={styles.playerCountValue}>{playerCount}</Text>
              <IconButton icon="plus" onPress={() => changePlayerCount(+1)} disabled={playerCount >= MAX_PLAYERS} />
            </View>
            <Text style={styles.helperText}>Min {MIN_PLAYERS} • Max {MAX_PLAYERS}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Selection</Text>
            <View style={styles.selectionRow}>
              <Text style={styles.selectionText}>Selected: {totalSelected}</Text>
              <Text style={styles.selectionText}>Remaining: {remaining}</Text>
            </View>
            <View style={styles.selectionRow}>
              <Text style={styles.selectionText}>Balance: {balance.total_score > 0 ? `+${balance.total_score}` : balance.total_score}</Text>
              <Text style={styles.selectionText}>Aliens: {alienSelected ? 'OK' : 'Missing'}</Text>
            </View>

            <View style={styles.actionsRow}>
              <Button mode="outlined" onPress={autoFillCrew} disabled={remaining === 0} style={styles.smallBtn}>
                Auto-fill Crew
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Crew</Text>
            <Divider style={styles.divider} />
            {CREW_ROLES.map(([roleKey]) => renderRoleRow(roleKey))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Aliens</Text>
            <Divider style={styles.divider} />
            {ALIEN_ROLES.map(([roleKey]) => renderRoleRow(roleKey))}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Independent</Text>
            <Divider style={styles.divider} />
            {INDEPENDENT_ROLES.map(([roleKey]) => renderRoleRow(roleKey))}
          </Card.Content>
        </Card>

        <View style={styles.bottom}>
          <Button mode="contained" onPress={onContinue} disabled={!isValid} style={styles.primaryBtn}>
            Continue
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()} style={styles.backBtn}>
            Back
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sticky: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stickyTitle: { color: darkTheme.colors.onSurface, fontWeight: '800', marginBottom: spacing.xs },
  stickyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  stickyText: { color: darkTheme.colors.onSurface, fontSize: 12 },
  stickyWarn: { color: '#FF9800', fontWeight: '800' },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: darkTheme.colors.primary },
  subtitle: { fontSize: 14, color: darkTheme.colors.onSurfaceVariant },
  card: { backgroundColor: darkTheme.colors.surface, marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: darkTheme.colors.onSurface, marginBottom: spacing.sm },
  divider: { marginBottom: spacing.sm, backgroundColor: darkTheme.colors.outline },
  playerCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  playerCountValue: { fontSize: 28, fontWeight: '800', color: darkTheme.colors.onSurface, paddingHorizontal: spacing.md },
  helperText: { textAlign: 'center', color: darkTheme.colors.onSurfaceVariant },
  selectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  selectionText: { color: darkTheme.colors.onSurface },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  smallBtn: { borderColor: darkTheme.colors.primary },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  roleInfo: { flex: 1, paddingRight: spacing.sm },
  roleName: { color: darkTheme.colors.onSurface, fontWeight: '700' },
  roleMeta: { color: darkTheme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  count: { minWidth: 24, textAlign: 'center', color: darkTheme.colors.onSurface, fontWeight: '700' },
  bottom: { marginTop: spacing.md, gap: spacing.sm },
  primaryBtn: { backgroundColor: darkTheme.colors.primary },
  backBtn: {},
});


