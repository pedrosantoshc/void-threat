import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { getOrCreateGuestId } from '../utils/guestId';

type GuestSetupScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'GuestSetup'>;
};

// Available avatar icons
const AVATAR_ICONS = ['🚀', '👽', '🔫', '🛸', '🌍', '⭐', '💀', '🎯', '🔒', '⚡'];

const GuestSetupScreen: React.FC<GuestSetupScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🚀');
  const setCurrentUser = useGameStore((state) => state.setCurrentUser);

  const handleContinue = async () => {
    if (username.trim()) {
      const guestId = await getOrCreateGuestId();
      // Set guest user in store
      setCurrentUser({
        id: guestId,
        name: username.trim(),
        username: username.trim(),
        avatar_icon: selectedIcon,
        is_guest: true,
        guest_id: guestId,
      });

      // Navigate to guest dashboard (not the stats dashboard)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  const isValidUsername = username.trim().length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            iconColor={darkTheme.colors.onSurfaceVariant}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.title}>Choose Your Identity</Text>
        </View>

        {/* Username Input */}
        <View style={styles.inputSection}>
          <TextInput
            label="Enter nickname..."
            value={username}
            onChangeText={setUsername}
            style={styles.textInput}
            maxLength={20}
            autoFocus
          />
        </View>

        {/* Avatar Selection */}
        <View style={styles.avatarSection}>
          <Text style={styles.sectionTitle}>Choose Avatar Icon:</Text>
          
          <View style={styles.iconGrid}>
            {AVATAR_ICONS.map((icon) => (
              <IconButton
                key={icon}
                icon={() => <Text style={styles.iconText}>{icon}</Text>}
                size={48}
                style={[
                  styles.iconButton,
                  selectedIcon === icon && styles.selectedIconButton
                ]}
                onPress={() => setSelectedIcon(icon)}
              />
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={!isValidUsername}
            style={[
              styles.continueButton,
              !isValidUsername && styles.disabledButton
            ]}
            labelStyle={styles.continueButtonText}
          >
            CONTINUE
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginLeft: spacing.md,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: darkTheme.colors.surface,
    fontSize: 14,
  },
  avatarSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconButton: {
    width: 60,
    height: 60,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    margin: 0,
  },
  selectedIconButton: {
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
  },
  iconText: {
    fontSize: 32,
  },
  buttonSection: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  continueButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  disabledButton: {
    backgroundColor: darkTheme.colors.outline,
  },
  continueButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default GuestSetupScreen;