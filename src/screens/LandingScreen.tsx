import React, { useState } from 'react';
import { View, StyleSheet, Alert, ImageBackground, Text, TouchableOpacity, Pressable, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { supabase } from '../config/supabase';
import { useGameStore } from '../store/gameStore';
import { BUILD_STAMP } from '../constants/build';

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
    <ImageBackground 
      source={require('../../assets/landing_page_bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      onError={(error) => console.log('Image load error:', error)}
      onLoad={() => console.log('Image loaded successfully')}
    >
      <LinearGradient
        colors={['rgba(10, 14, 39, 0.75)', 'rgba(27, 31, 59, 0.65)', 'rgba(10, 14, 39, 0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {/* Logo and Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/void-threat-logo.png')}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.title}>VOID THREAT</Text>
              <Text style={styles.tagline}>Hidden roles. Silent kills.</Text>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Action Buttons */}
            <View style={styles.buttonSection}>
              <Pressable
                onPress={() => navigation.navigate('Auth')}
                style={({ pressed }) => [
                  styles.premiumButton,
                  styles.primaryButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <LinearGradient
                  colors={['#00FF41', '#00CC33']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.primaryButtonText}>SIGN IN / SIGN UP</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('GuestSetup')}
                style={({ pressed }) => [
                  styles.premiumButton,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <Text style={styles.secondaryButtonText}>PLAY AS GUEST</Text>
              </Pressable>

              {/* Debug Buttons */}
              <TouchableOpacity
                onPress={async () => {
                  // Clear Supabase session
                  await supabase.auth.signOut();
                  // Clear app state
                  setCurrentUser(null);
                  resetGame();
                  Alert.alert('Cache Cleared', 'All app data cleared!');
                }}
                style={styles.debugButton}
              >
                <Text style={styles.debugButtonText}>Clear Cache (Debug)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const extra = (Constants.expoConfig?.extra || {}) as { supabaseUrl?: string };
                    const configuredUrl = extra.supabaseUrl;

                    // 0) Verify we're pointing at a real Supabase project (JWKS should always exist)
                    if (configuredUrl) {
                      const jwksUrl = `${configuredUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
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
                style={styles.debugButton}
              >
                <Text style={styles.debugButtonText}>Ping Supabase (Debug)</Text>
              </TouchableOpacity>

              <Text style={styles.buildText}>
                Build: {BUILD_STAMP}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0E27', // Fallback background color
  },
  gradientOverlay: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 134, // 112 * 1.2 = 134.4 ≈ 134 (20% larger)
    height: 134,
    borderRadius: 67, // Half of width/height for perfect circle
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 134,
    height: 134,
  },
  title: {
    fontSize: 48,
    fontFamily: 'BrunoAce-Regular',
    color: '#00FF41',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#00FF41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    width: '100%',
    gap: 16,
    paddingBottom: 20,
  },
  premiumButton: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primaryButtonText: {
    color: '#0A0E27',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#00FF41',
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00FF41',
    fontFamily: 'BrunoAce-Regular',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  debugButton: {
    marginTop: 12,
    padding: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '400',
  },
  buildText: {
    marginTop: 8,
    opacity: 0.5,
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
});

export default LandingScreen;