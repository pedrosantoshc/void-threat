import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Avatar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { updateProfile, getCurrentUser } from '../config/supabase';

type UserProfileScreenProps = {
  navigation: StackNavigationProp<NavigationStackParamList, 'UserProfile'>;
};

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  const { currentUser, setCurrentUser } = useGameStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.name || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await updateProfile({
        display_name: displayName.trim(),
      });

      if (error) {
        Alert.alert('Error', 'Failed to update profile: ' + error.message);
        return;
      }

      // Update local user state
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          name: displayName.trim(),
        });
      }

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (currentUser) {
      setDisplayName(currentUser.name || '');
      setEmail(currentUser.email || '');
    }
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password reset functionality will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion will be available in a future update.');
          },
        },
      ]
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>User not found</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar.Text
            size={80}
            label={displayName.charAt(0).toUpperCase()}
            style={styles.avatar}
          />
          <Text style={styles.title}>Profile Settings</Text>
        </View>

        {/* Profile Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Profile Information</Text>
            
            <View style={styles.form}>
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                mode="outlined"
                disabled={!isEditing || isLoading}
                autoCapitalize="words"
              />

              <TextInput
                label="Email"
                value={email}
                style={styles.input}
                mode="outlined"
                disabled={true} // Email cannot be changed
                keyboardType="email-address"
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon="lock"
                    size={20}
                    iconColor={darkTheme.colors.onSurfaceVariant}
                  />
                }
              />
              
              <Text style={styles.emailHelp}>
                Email address cannot be changed. Contact support if you need to update it.
              </Text>
            </View>

            <View style={styles.profileActions}>
              {!isEditing ? (
                <Button
                  mode="contained"
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                  labelStyle={styles.editButtonText}
                >
                  EDIT PROFILE
                </Button>
              ) : (
                <View style={styles.editingActions}>
                  <Button
                    mode="outlined"
                    onPress={handleCancel}
                    disabled={isLoading}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.saveButton}
                    labelStyle={styles.saveButtonText}
                  >
                    SAVE
                  </Button>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Account Security */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Account Security</Text>
            
            <Button
              mode="outlined"
              onPress={handleChangePassword}
              style={styles.securityButton}
              labelStyle={styles.securityButtonText}
              icon="key"
            >
              Change Password
            </Button>
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Account Actions</Text>
            
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('UserDashboard')}
              style={styles.actionButton}
              labelStyle={styles.actionButtonText}
              icon="arrow-left"
            >
              Back to Dashboard
            </Button>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={handleDeleteAccount}
              style={styles.dangerButton}
              labelStyle={styles.dangerButtonText}
              icon="delete"
            >
              Delete Account
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    backgroundColor: darkTheme.colors.primary,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  form: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: darkTheme.colors.background,
    marginBottom: spacing.md,
  },
  emailHelp: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: -spacing.sm,
  },
  profileActions: {
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  editButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  editingActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    color: darkTheme.colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  securityButton: {
    borderColor: darkTheme.colors.primary,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  securityButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 14,
  },
  actionButton: {
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  actionButtonText: {
    color: darkTheme.colors.onSurface,
    fontSize: 14,
  },
  divider: {
    backgroundColor: darkTheme.colors.outline,
    marginVertical: spacing.md,
  },
  dangerButton: {
    borderColor: darkTheme.colors.error,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  dangerButtonText: {
    color: darkTheme.colors.error,
    fontSize: 14,
  },
});

export default UserProfileScreen;