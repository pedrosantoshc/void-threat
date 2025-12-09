import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';

interface SimpleLandingScreenProps {
  onLoginPress: () => void;
  onGuestPress: () => void;
}

const SimpleLandingScreen: React.FC<SimpleLandingScreenProps> = ({
  onLoginPress,
  onGuestPress,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>VOID THREAT</Text>
          <Text style={styles.tagline}>Hidden roles. Silent kills.</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>👽</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <Button
            title="LOGIN WITH GOOGLE"
            onPress={onLoginPress}
            variant="primary"
            style={styles.button}
          />

          <Button
            title="PLAY AS GUEST"
            onPress={onGuestPress}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#00FF00',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    fontSize: 120,
    opacity: 0.8,
  },
  buttonSection: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
  },
});

export default SimpleLandingScreen;