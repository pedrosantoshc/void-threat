import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Dimensions, FlatList, Image, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Switch, Text } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';
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

const SHEET_ART_HEIGHT = Math.min(420, Dimensions.get('window').height * 0.42);

function onlyNonZero(counts: Record<string, number>) {
  return Object.fromEntries(Object.entries(counts).filter(([_, v]) => v > 0));
}

type Team = 'crew' | 'alien' | 'independent';

function teamColor(team: Team) {
  switch (team) {
    case 'crew':
      return '#00FF00';
    case 'alien':
      return '#F44336';
    case 'independent':
      return '#9C27B0';
    default:
      return darkTheme.colors.outline;
  }
}

/**
 * NOTE: require() paths must be static. This mapping is UI-only and uses your renamed assets.
 */
function getRoleArt(roleKey: string) {
  const fallback = require('../../assets/optimized/ui/void-threat-logo.png');

  switch (roleKey) {
    // Crew
    case 'crew_member':
      return require('../../assets/optimized/crew/crew_member.jpg');
    case 'bioscanner':
      return require('../../assets/optimized/crew/bioscanner.jpg');
    case 'junior_scanner':
      return require('../../assets/optimized/crew/junior_scanner.jpg');
    case 'dna_tracker':
      return require('../../assets/optimized/crew/dna_tracker.jpg');
    case 'observer':
      return require('../../assets/optimized/crew/observer.jpg');
    case 'tragic_hero':
      return require('../../assets/optimized/crew/tragic_hero.jpg');
    case 'scientist':
      return require('../../assets/optimized/crew/scientist.jpg');
    case 'watchman':
      return require('../../assets/optimized/crew/watchman.jpg');
    case 'ship_captain':
      return require('../../assets/optimized/crew/ship_captain.jpg');
    case 'vip_passenger':
      return require('../../assets/optimized/crew/vip_passenger.jpg');
    case 'ship_doctor':
      return require('../../assets/optimized/crew/ship_doctor.jpg');
    case 'detective':
      return require('../../assets/optimized/crew/detective.jpg');
    case 'silencer':
      return require('../../assets/optimized/crew/silencer.jpg');
    case 'soldier':
      return require('../../assets/optimized/crew/soldier.jpg');
    case 'clone':
      return require('../../assets/optimized/crew/clone.jpg');
    case 'false_positive':
      return require('../../assets/optimized/crew/false_positive.jpg');
    case 'quarantined_crew':
      return require('../../assets/optimized/crew/quarantined_crew.jpg');

    // Alien
    case 'alien':
      return require('../../assets/optimized/alien/alien.jpg');
    case 'alien_pup':
      return require('../../assets/optimized/alien/alien_pup.jpg');
    case 'sleep_alien':
      return require('../../assets/optimized/alien/sleep_alien.jpg');
    case 'rogue_alien':
      return require('../../assets/optimized/alien/rogue_alien.jpg');
    case 'alien_scanner':
      return require('../../assets/optimized/alien/alien_scanner.jpg');
    case 'parasyte_alien':
      return require('../../assets/optimized/alien/parasyte_alien.jpg');
    case 'humanoid_alien':
      return require('../../assets/optimized/alien/humanoid_alien.jpg');
    case 'infected_crewmember':
      return require('../../assets/optimized/alien/infected_crewmember.jpg');

    // Independent
    case 'predator':
      return require('../../assets/optimized/alien/predator.jpg');

    default:
      return fallback;
  }
}

type RoleGridItem = { roleKey: string };

function formatSigned(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

type AmuletKey = 'shielding_device' | 'resonance_tracker' | 'neural_implant' | 'bio_scanner' | 'echo_beacon';

const AMULETS: Array<{ key: AmuletKey; name: string }> = [
  { key: 'shielding_device', name: 'Shielding Device' },
  { key: 'resonance_tracker', name: 'Resonance Tracker' },
  { key: 'neural_implant', name: 'Neural Implant' },
  { key: 'bio_scanner', name: 'Bio Scanner' },
  { key: 'echo_beacon', name: 'Echo Beacon' },
];

type PreviewItem =
  | { kind: 'role'; key: string }
  | { kind: 'amulet'; key: AmuletKey };

function getAmuletArt(amuletKey: AmuletKey) {
  const fallback = require('../../assets/optimized/ui/void-threat-logo.png');
  switch (amuletKey) {
    case 'shielding_device':
      return require('../../assets/optimized/amulets/shielding_device.jpg');
    case 'resonance_tracker':
      return require('../../assets/optimized/amulets/resonance_tracker.jpg');
    case 'neural_implant':
      return require('../../assets/optimized/amulets/neural_implant.jpg');
    case 'bio_scanner':
      return require('../../assets/optimized/amulets/bio_scanner.jpg');
    case 'echo_beacon':
      return require('../../assets/optimized/amulets/echo_beacon.jpg');
    default:
      return fallback;
  }
}

export default function CustomGameScreen({ navigation, route }: Props) {
  const { game_id } = route.params;
  const insets = useSafeAreaInsets();
  const { current_game, setCurrentGame, setGameMode } = useGameStore();

  const [headerHeight, setHeaderHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);

  const [playerCount, setPlayerCount] = useState<number>(
    clamp(current_game?.max_players ?? 8, MIN_PLAYERS, MAX_PLAYERS)
  );

  const [roleCounts, setRoleCounts] = useState<Record<string, number>>(() => ({
    bioscanner: 1,
    alien: 1,
    crew_member: Math.max(0, (current_game?.max_players ?? 8) - 2),
  }));

  // Epic B will wire this into persistence and amulet UI.
  const [addAmulets, setAddAmulets] = useState(false);
  const [amuletCounts, setAmuletCounts] = useState<Record<string, number>>(() => ({
    shielding_device: 0,
    resonance_tracker: 0,
    neural_implant: 0,
    bio_scanner: 0,
    echo_beacon: 0,
  }));

  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

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

  const bumpRole = useCallback((roleKey: string, delta: number) => {
    setRoleCounts(prev => {
      const next = { ...prev };
      const curr = next[roleKey] ?? 0;
      next[roleKey] = Math.max(0, curr + delta);
      return next;
    });
  }, []);

  const autoFillCrew = useCallback(() => {
    setRoleCounts(prev => {
      const next = { ...prev };
      const total = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
      const needed = playerCount - total;
      next.crew_member = Math.max(0, (next.crew_member ?? 0) + needed);
      return next;
    });
  }, [playerCount]);

  const changePlayerCount = useCallback((delta: number) => {
    setPlayerCount(prev => clamp(prev + delta, MIN_PLAYERS, MAX_PLAYERS));
  }, []);

  const bumpAmulet = useCallback((amuletKey: string, delta: number) => {
    setAmuletCounts(prev => {
      const next = { ...prev };
      const curr = next[amuletKey] ?? 0;
      next[amuletKey] = Math.max(0, curr + delta);
      return next;
    });
  }, []);

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
        custom_amulets: addAmulets ? onlyNonZero(amuletCounts) : null,
      } as any);

      setCurrentGame(updates);
      navigation.navigate('GameSetup', { game_id });
    } catch (e) {
      Alert.alert('Failed to save custom game', String((e as any)?.message || e));
    }
  };

  const balanceScore = balance.total_score;
  const balanceLabel = balanceScore > 0 ? 'CREW FAVORED' : balanceScore < 0 ? 'ALIEN FAVORED' : 'BALANCED';
  const balanceTint = balanceScore > 0 ? teamColor('crew') : balanceScore < 0 ? teamColor('alien') : darkTheme.colors.onSurfaceVariant;

  const roleGridItems: RoleGridItem[] = useMemo(() => {
    return [
      ...CREW_ROLES.map(([roleKey]) => ({ roleKey })),
      ...ALIEN_ROLES.map(([roleKey]) => ({ roleKey })),
      ...INDEPENDENT_ROLES.map(([roleKey]) => ({ roleKey })),
    ];
  }, []);

  const renderRoleCard = useCallback(
    ({ item }: { item: RoleGridItem }) => {
      const roleKey = item.roleKey;
      const def = ROLES[roleKey];
      if (!def) return null;

      const count = roleCounts[roleKey] ?? 0;
      const team = def.team as Team;
      const selected = count > 0;

      const plusDisabled = totalSelected >= playerCount;
      const minusDisabled = count <= 0;

      const border = selected ? teamColor(team) : '#2A2F55';

      return (
        <View style={styles.cardWrap}>
          <View style={[styles.roleCard, { borderColor: border }, selected && styles.roleCardSelected]}>
            <Pressable onPress={() => setPreviewItem({ kind: 'role', key: roleKey })} style={styles.imagePress}>
              <Image source={getRoleArt(roleKey)} style={styles.roleImage} resizeMode="cover" />
            </Pressable>

            <Text style={styles.roleName} numberOfLines={1}>
              {def.name}
            </Text>

            <Text style={[styles.roleGrade, { color: teamColor(team) }]}>
              Grade {formatSigned(def.grade)}
            </Text>

            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => bumpRole(roleKey, -1)}
                disabled={minusDisabled}
                style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled, { borderColor: border }]}
              >
                <Text style={[styles.stepBtnText, minusDisabled && styles.stepBtnTextDisabled]}>−</Text>
              </Pressable>

              <Text style={styles.countText}>{count}</Text>

              <Pressable
                onPress={() => bumpRole(roleKey, +1)}
                disabled={plusDisabled}
                style={[styles.stepBtn, plusDisabled && styles.stepBtnDisabled, { borderColor: border }]}
              >
                <Text style={[styles.stepBtnText, plusDisabled && styles.stepBtnTextDisabled]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [bumpRole, playerCount, roleCounts, totalSelected]
  );

  const renderAmuletsHeader = useMemo(() => {
    if (!addAmulets) return null;

    return (
      <View style={styles.amuletsSection}>
        <Text style={styles.sectionTitle}>AMULETS</Text>
        <View style={styles.amuletsGrid}>
          {AMULETS.map((a) => {
            const count = amuletCounts[a.key] ?? 0;
            const minusDisabled = count <= 0;
            return (
              <View key={a.key} style={styles.amuletWrap}>
                <View style={[styles.amuletCard, count > 0 && styles.amuletCardSelected]}>
                  <Pressable onPress={() => setPreviewItem({ kind: 'amulet', key: a.key })} style={styles.imagePress}>
                    <Image source={getAmuletArt(a.key)} style={styles.amuletImage} resizeMode="cover" />
                  </Pressable>
                  <Text style={styles.amuletName} numberOfLines={1}>
                    {a.name}
                  </Text>

                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => bumpAmulet(a.key, -1)}
                      disabled={minusDisabled}
                      style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled, { borderColor: '#4DD0E1' }]}
                    >
                      <Text style={[styles.stepBtnText, minusDisabled && styles.stepBtnTextDisabled]}>−</Text>
                    </Pressable>

                    <Text style={styles.countText}>{count}</Text>

                    <Pressable
                      onPress={() => bumpAmulet(a.key, +1)}
                      style={[styles.stepBtn, { borderColor: '#4DD0E1' }]}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>ROLES</Text>
      </View>
    );
  }, [addAmulets, amuletCounts, bumpAmulet]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed sticky header */}
      <View
        onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, spacing.sm) }]}
      >
        <View style={styles.headerPanel}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerKicker}>CUSTOM GAME · {playerCount} PLAYERS</Text>
            <View style={styles.playerCountControls}>
              <IconButton
                icon="minus"
                size={18}
                onPress={() => changePlayerCount(-1)}
                disabled={playerCount <= MIN_PLAYERS}
                style={styles.headerIconBtn}
              />
              <IconButton
                icon="plus"
                size={18}
                onPress={() => changePlayerCount(+1)}
                disabled={playerCount >= MAX_PLAYERS}
                style={styles.headerIconBtn}
              />
            </View>
          </View>

          <View style={styles.headerLine} />

          <Text style={styles.headerText}>
            Selected: <Text style={styles.headerTextStrong}>{totalSelected}</Text> / {playerCount}
          </Text>

          <Text style={[styles.headerBalance, { color: balanceTint }]}>
            BALANCE: {formatSigned(balanceScore)} · {balanceLabel}
          </Text>

          <View style={styles.headerRowTeams}>
            <Text style={[styles.teamStat, { color: teamColor('crew') }]}>Crew: {teamCounts.crew}</Text>
            <Text style={[styles.teamStat, { color: teamColor('alien') }]}>Aliens: {teamCounts.alien}</Text>
            <Text style={[styles.teamStat, { color: teamColor('independent') }]}>Indep: {teamCounts.independent}</Text>
          </View>

          <View style={styles.headerActionsRow}>
            <Button mode="text" onPress={autoFillCrew} disabled={remaining === 0} labelStyle={styles.autoFillText} compact>
              Auto-fill Crew
            </Button>

            <Text style={styles.remainingText}>Remaining: {Math.max(0, remaining)}</Text>
          </View>

          {/* Placeholder UI for amulets toggle (Epic B will add grid + persistence) */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Add amulets</Text>
            <Switch value={addAmulets} onValueChange={setAddAmulets} />
          </View>
        </View>
      </View>

      {/* Role grid */}
      <FlatList
        data={roleGridItems}
        keyExtractor={i => i.roleKey}
        numColumns={2}
        renderItem={renderRoleCard}
        ListHeaderComponent={renderAmuletsHeader}
        contentContainerStyle={[
          styles.gridContent,
          {
            paddingTop: headerHeight + spacing.md,
            paddingBottom: bottomHeight + spacing.md,
          },
        ]}
        columnWrapperStyle={styles.columnWrap}
        showsVerticalScrollIndicator={false}
      />

      {/* Fixed bottom confirm */}
      <View
        onLayout={e => setBottomHeight(e.nativeEvent.layout.height)}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      >
        <Button
          mode="contained"
          onPress={onContinue}
          disabled={!isValid}
          style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
          labelStyle={[styles.confirmBtnLabel, !isValid && styles.confirmBtnLabelDisabled]}
        >
          CONFIRM & START GAME
        </Button>
      </View>

      {/* Role preview (bottom sheet-ish) */}
      <Modal
        visible={!!previewItem}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewItem(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewItem(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {previewItem ? (
              previewItem.kind === 'role' ? (
                <>
                  <Image source={getRoleArt(previewItem.key)} style={styles.sheetArt} resizeMode="contain" />
                  <Text style={styles.sheetTitle}>{ROLES[previewItem.key]?.name ?? previewItem.key}</Text>
                  <Text style={[styles.sheetMeta, { color: teamColor((ROLES[previewItem.key]?.team ?? 'crew') as Team) }]}>
                    Grade: {formatSigned(ROLES[previewItem.key]?.grade ?? 0)} · {(ROLES[previewItem.key]?.team ?? '').toUpperCase()}
                  </Text>
                  <Text style={styles.sheetDesc}>{ROLES[previewItem.key]?.description ?? ''}</Text>

                  <View style={styles.sheetStepperRow}>
                    <Pressable
                      onPress={() => bumpRole(previewItem.key, -1)}
                      disabled={(roleCounts[previewItem.key] ?? 0) <= 0}
                      style={[
                        styles.sheetStepBtn,
                        (roleCounts[previewItem.key] ?? 0) <= 0 && styles.stepBtnDisabled,
                        { borderColor: teamColor((ROLES[previewItem.key]?.team ?? 'crew') as Team) },
                      ]}
                    >
                      <Text style={[styles.stepBtnText, (roleCounts[previewItem.key] ?? 0) <= 0 && styles.stepBtnTextDisabled]}>
                        −
                      </Text>
                    </Pressable>

                    <Text style={styles.sheetCountText}>{roleCounts[previewItem.key] ?? 0}</Text>

                    <Pressable
                      onPress={() => bumpRole(previewItem.key, +1)}
                      disabled={totalSelected >= playerCount}
                      style={[
                        styles.sheetStepBtn,
                        totalSelected >= playerCount && styles.stepBtnDisabled,
                        { borderColor: teamColor((ROLES[previewItem.key]?.team ?? 'crew') as Team) },
                      ]}
                    >
                      <Text style={[styles.stepBtnText, totalSelected >= playerCount && styles.stepBtnTextDisabled]}>+</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Image source={getAmuletArt(previewItem.key)} style={styles.sheetArt} resizeMode="contain" />
                  <Text style={styles.sheetTitle}>
                    {AMULETS.find(a => a.key === previewItem.key)?.name ?? previewItem.key}
                  </Text>
                  <Text style={[styles.sheetMeta, { color: '#4DD0E1' }]}>AMULET</Text>

                  <View style={styles.sheetStepperRow}>
                    <Pressable
                      onPress={() => bumpAmulet(previewItem.key, -1)}
                      disabled={(amuletCounts[previewItem.key] ?? 0) <= 0}
                      style={[
                        styles.sheetStepBtn,
                        (amuletCounts[previewItem.key] ?? 0) <= 0 && styles.stepBtnDisabled,
                        { borderColor: '#4DD0E1' },
                      ]}
                    >
                      <Text style={[styles.stepBtnText, (amuletCounts[previewItem.key] ?? 0) <= 0 && styles.stepBtnTextDisabled]}>
                        −
                      </Text>
                    </Pressable>

                    <Text style={styles.sheetCountText}>{amuletCounts[previewItem.key] ?? 0}</Text>

                    <Pressable
                      onPress={() => bumpAmulet(previewItem.key, +1)}
                      style={[styles.sheetStepBtn, { borderColor: '#4DD0E1' }]}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </>
              )
            ) : null}

            <Button mode="text" onPress={() => setPreviewItem(null)} labelStyle={styles.closeText}>
              Close
            </Button>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },

  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },

  headerPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: '#0F1433',
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.22)',
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerKicker: {
    ...typography.bodySmall,
    color: '#B7C2FF',
    letterSpacing: 1,
  },

  playerCountControls: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { margin: 0 },

  headerLine: {
    height: 1,
    backgroundColor: 'rgba(183,194,255,0.16)',
    marginVertical: spacing.sm,
  },

  headerText: {
    ...typography.body,
    color: '#EAF0FF',
    textAlign: 'center',
  },
  headerTextStrong: { fontFamily: 'BrunoAce-Regular', color: '#FFFFFF' },

  headerBalance: {
    ...typography.bodySmall,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.8,
  },

  headerRowTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  teamStat: { ...typography.bodySmall, letterSpacing: 0.3 },

  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  autoFillText: { color: '#00FF00', fontFamily: 'BrunoAce-Regular', fontSize: 12 },
  remainingText: { ...typography.bodySmall, color: darkTheme.colors.onSurfaceVariant },

  toggleRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(183,194,255,0.14)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { ...typography.bodySmall, color: '#EAF0FF' },

  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: spacing.xl,
  },

  columnWrap: {
    gap: 16,
  },

  cardWrap: {
    flex: 1,
    marginBottom: 24,
  },

  roleCard: {
    backgroundColor: '#121630',
    borderRadius: 10,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
  },

  roleCardSelected: {
    shadowColor: '#00FF00',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  imagePress: { width: '100%', alignItems: 'center' },

  roleImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#0B102A',
  },

  roleName: {
    marginTop: 10,
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 14,
    textAlign: 'center',
  },

  roleGrade: {
    marginTop: 6,
    fontFamily: 'BrunoAce-Regular',
    fontSize: 12,
    textAlign: 'center',
  },

  stepperRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  stepBtn: {
    width: 34,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  stepBtnDisabled: { opacity: 0.35 },

  stepBtnText: {
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 18,
    lineHeight: 18,
  },
  stepBtnTextDisabled: { color: '#B0B0B0' },

  countText: {
    minWidth: 24,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 14,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'rgba(10,14,39,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(183,194,255,0.14)',
  },

  confirmBtn: {
    backgroundColor: '#00FF00',
    borderRadius: 10,
    paddingVertical: 8,
  },

  confirmBtnDisabled: { backgroundColor: '#1D2347' },

  confirmBtnLabel: {
    color: '#0A0E27',
    fontFamily: 'BrunoAce-Regular',
    letterSpacing: 1,
  },

  confirmBtnLabelDisabled: { color: '#6D74A8' },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F1433',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(183,194,255,0.18)',
    paddingBottom: spacing.md,
    maxHeight: '88%',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(183,194,255,0.35)',
    marginTop: 10,
    marginBottom: 10,
  },

  sheetContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },

  sheetArt: {
    width: '100%',
    height: SHEET_ART_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#0B102A',
  },

  sheetTitle: {
    marginTop: spacing.md,
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 18,
    textAlign: 'center',
  },

  sheetMeta: {
    marginTop: 6,
    fontFamily: 'BrunoAce-Regular',
    fontSize: 12,
    textAlign: 'center',
  },

  sheetDesc: {
    marginTop: spacing.md,
    color: '#EAF0FF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },

  sheetStepperRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },

  sheetStepBtn: {
    width: 52,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  sheetCountText: {
    minWidth: 28,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 16,
  },

  closeText: { marginTop: spacing.md, color: darkTheme.colors.onSurfaceVariant, fontFamily: 'BrunoAce-Regular' },

  amuletsSection: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.bodySmall,
    color: '#B7C2FF',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(183,194,255,0.16)',
    marginVertical: spacing.md,
  },

  amuletsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 24,
  },

  amuletWrap: {
    width: '48%',
  },

  amuletCard: {
    backgroundColor: '#121630',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2A2F55',
    padding: 10,
    alignItems: 'center',
  },

  amuletCardSelected: {
    borderColor: '#4DD0E1',
  },

  amuletImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#0B102A',
  },

  amuletName: {
    marginTop: 10,
    color: '#FFFFFF',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
});


