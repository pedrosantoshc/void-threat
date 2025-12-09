import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { supabase } from '../config/supabase';

type LandingScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Landing'>;
};

const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'exp://localhost:19000', // For Expo Go
        },
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        return;
      }

      // Success - navigate to dashboard
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Login Error', 'Failed to login with Google');
    } finally {
      setIsLoading(false);
    }
  };

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
            onPress={handleGoogleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            {isLoading ? 'SIGNING IN...' : 'LOGIN WITH GOOGLE'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('GuestSetup')}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonText}
          >
            PLAY AS GUEST
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