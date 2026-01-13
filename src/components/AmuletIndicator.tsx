// Amulet Indicator Component
// Displays amulets held by a player as chips/badges
// Used on PlayerRoleScreen and other player views

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { Amulet } from '../types';
import { getAmuletDisplayName, getAmuletIcon } from '../utils/amuletLogic';

interface AmuletIndicatorProps {
  amulets: Amulet[];
  playerId: string;
  compact?: boolean; // Show compact version (icon only)
}

export default function AmuletIndicator({
  amulets,
  playerId,
  compact = false,
}: AmuletIndicatorProps) {
  // Filter amulets held by this player
  const playerAmulets = amulets.filter(
    (a) => a.current_holder_id === playerId && !a.is_used
  );

  if (playerAmulets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {playerAmulets.map((amulet) => (
        <Chip
          key={amulet.id}
          mode="outlined"
          icon={getAmuletIcon(amulet.amulet_type)}
          style={styles.chip}
          textStyle={styles.chipText}
          compact={compact}
        >
          {compact ? '' : getAmuletDisplayName(amulet.amulet_type)}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#1B1F3B',
    borderColor: '#00FF00',
  },
  chipText: {
    color: '#00FF00',
    fontSize: 12,
  },
});
