import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing, typography } from '../constants/theme';

type LandingScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'Landing'>;
};

const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
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
            onPress={() => {
              // TODO: Implement Google OAuth
              navigation.navigate('Dashboard');
            }}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            LOGIN WITH GOOGLE
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
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    color: darkTheme.colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.bodyLarge.fontSize,
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
    fontWeight: 'bold',
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