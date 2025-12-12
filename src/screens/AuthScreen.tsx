import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, Card, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { supabase } from '../config/supabase';
import { useGameStore } from '../store/gameStore';

type AuthScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Auth'>;
};

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useGameStore();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          Alert.alert('Login Error', error.message);
          return;
        }

        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            name: data.user.user_metadata?.display_name || email,
            email: data.user.email || email,
          });
          navigation.navigate('UserDashboard');
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (error) {
          Alert.alert('Sign Up Error', error.message);
          return;
        }

        if (data.user) {
          // Check if user needs email confirmation
          if (!data.session) {
            Alert.alert(
              'Check Your Email',
              'We sent you a confirmation link. Please check your email and click the link to activate your account.',
              [
                {
                  text: 'OK',
                  onPress: () => setIsLogin(true),
                },
              ]
            );
            return;
          }

          setCurrentUser({
            id: data.user.id,
            name: displayName,
            email: email,
          });
          navigation.navigate('UserDashboard');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Join the Crew'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Sign in to continue your mission' 
              : 'Create your account to start hunting aliens'
            }
          </Text>
        </View>

        {/* Form */}
        <Card style={styles.formCard}>
          <Card.Content style={styles.form}>
            {/* Display Name (Sign Up only) */}
            {!isLogin && (
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                mode="outlined"
                disabled={isLoading}
                autoCapitalize="words"
              />
            )}

            {/* Email */}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Password */}
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={isLoading}
            />

            {/* Confirm Password (Sign Up only) */}
            {!isLogin && (
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                mode="outlined"
                secureTextEntry
                autoComplete="new-password"
                disabled={isLoading}
              />
            )}

            {/* Auth Button */}
            <Button
              mode="contained"
              onPress={handleEmailAuth}
              loading={isLoading}
              disabled={isLoading}
              style={styles.primaryButton}
              labelStyle={styles.primaryButtonText}
            >
              {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </Button>

            {/* Toggle Mode */}
            <Button
              mode="text"
              onPress={toggleMode}
              disabled={isLoading}
              style={styles.toggleButton}
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'
              }
            </Button>
          </Card.Content>
        </Card>

        {/* Social auth (Google) hidden for now while stabilizing Supabase + schema */}

        {/* Guest Option */}
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('GuestSetup')}
          disabled={isLoading}
          style={styles.guestButton}
          labelStyle={styles.guestButtonText}
        >
          PLAY AS GUEST
        </Button>

        {/* Back to Landing */}
        <Button
          mode="text"
          onPress={() => navigation.navigate('Landing')}
          disabled={isLoading}
          style={styles.backButton}
        >
          Back to Home
        </Button>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: '100%',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: darkTheme.colors.background,
  },
  primaryButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleButton: {
    marginTop: spacing.xs,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    backgroundColor: darkTheme.colors.outline,
  },
  dividerText: {
    color: darkTheme.colors.onSurfaceVariant,
    marginHorizontal: spacing.md,
    fontSize: 14,
  },
  guestButton: {
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  guestButtonText: {
    color: darkTheme.colors.onSurface,
    fontSize: 16,
  },
  backButton: {
    marginTop: spacing.lg,
  },
});

export default AuthScreen;