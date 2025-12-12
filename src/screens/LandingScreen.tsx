import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { supabase } from '../config/supabase';
import { useGameStore } from '../store/gameStore';

type LandingScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Landing'>;
};

const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser, resetGame } = useGameStore();

  // Clear any existing session when landing screen loads
  React.useEffect(() => {
    setCurrentUser(null);
    resetGame();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>VOID THREAT</Text>
          <Text style={styles.tagline}>Hidden roles. Silent kills.</Text>
        </View>

        {/* Illustration Placeholder */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationPlaceholder}>👽</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Auth')}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            SIGN IN / SIGN UP
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('GuestSetup')}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonText}
          >
            PLAY AS GUEST
          </Button>

          {/* Debug Buttons */}
          <Button
            mode="text"
            onPress={async () => {
              // Clear Supabase session
              await supabase.auth.signOut();
              // Clear app state
              setCurrentUser(null);
              resetGame();
              Alert.alert('Cache Cleared', 'All app data cleared!');
            }}
            style={{ marginTop: 16 }}
          >
            Clear Cache (Debug)
          </Button>
          
          <Button
            mode="text"
            onPress={async () => {
              try {
                const extra = (Constants.expoConfig?.extra || {}) as { supabaseUrl?: string };
                const configuredUrl = extra.supabaseUrl;

                // 0) Verify we're pointing at a real Supabase project (JWKS should always exist)
                if (configuredUrl) {
                  const jwksUrl = `${configuredUrl.replace(/\\/$/, '')}/auth/v1/.well-known/jwks.json`;
                  const jwksRes = await fetch(jwksUrl);
                  if (!jwksRes.ok) {
                    Alert.alert(
                      'Ping Supabase',
                      `JWKS check failed (${jwksRes.status}). This usually means your EXPO_PUBLIC_SUPABASE_URL is wrong.\n\nURL: ${configuredUrl}`
                    );
                    return;
                  }
                }

                // 1) Ping Auth API first (doesn't depend on table names)
                const authRes = await supabase.auth.getSession();
                if (authRes.error) {
                  Alert.alert('Ping Supabase', `Auth error: ${authRes.error.message}`);
                  return;
                }

                // 2) Ping DB via PostgREST. After schema changes, table names/schemas may differ.
                // Try a few likely tables and report which one responds.
                const candidates = ['game_sessions', 'game_players', 'night_actions', 'user_profiles'];
                for (const table of candidates) {
                  const { error } = await supabase.from(table).select('*').limit(1);
                  if (!error) {
                    Alert.alert('Ping Supabase', `OK (table: ${table})\nURL: ${configuredUrl || '(unknown)'}`);
                    return;
                  }

                  // If we get a non-404 error (e.g., RLS), connectivity is still OK.
                  const msg = error.message || '';
                  if (!msg.toLowerCase().includes('404')) {
                    Alert.alert('Ping Supabase', `Connected, but query failed on "${table}": ${msg}\nURL: ${configuredUrl || '(unknown)'}`);
                    return;
                  }
                }

                Alert.alert(
                  'Ping Supabase',
                  `Auth OK, but PostgREST returned 404 for common tables.\n\nThis usually means your tables were renamed/moved after your restructure OR you're pointing at the wrong project.\n\nURL: ${configuredUrl || '(unknown)'}`
                );
              } catch (e) {
                Alert.alert('Ping Supabase', String(e));
              }
            }}
            style={{ marginTop: 8 }}
          >
            Ping Supabase (Debug)
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationPlaceholder: {
    fontSize: 120,
    opacity: 0.8,
  },
  buttonSection: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 16,
  },
});

export default LandingScreen;