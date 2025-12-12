import React from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { darkTheme, spacing } from '../constants/theme';

interface GoogleSignInButtonProps {
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  const handleGoogleSignIn = async () => {
    // Simple placeholder for now - will implement when ready for production build
    Alert.alert('Coming Soon', 'Google Sign-In will be available in production builds. For now, use Guest mode to test the app!');
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        (disabled || loading) && styles.disabled
      ]}
      onPress={handleGoogleSignIn}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <Text style={styles.logo}>G</Text>
      <Text style={styles.text}>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.6,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
  },
});

export default GoogleSignInButton;