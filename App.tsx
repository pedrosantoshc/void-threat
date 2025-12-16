import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import * as Font from 'expo-font';

import { NavigationStackParamList } from './src/types';
import LandingScreen from './src/screens/LandingScreen';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import UserDashboardScreen from './src/screens/UserDashboardScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import GuestSetupScreen from './src/screens/GuestSetupScreen';
import CreateGameScreen from './src/screens/CreateGameScreen';
import JoinGameScreen from './src/screens/JoinGameScreen';
import GameModeSelectorScreen from './src/screens/GameModeSelectorScreen';
import CustomGameScreen from './src/screens/CustomGameScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import QrScannerScreen from './src/screens/QrScannerScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import PlayerRoleScreen from './src/screens/PlayerRoleScreen';
import NightPhaseScreen from './src/screens/NightPhaseScreen';
import DayPhaseScreen from './src/screens/DayPhaseScreen';

const Stack = createStackNavigator<NavigationStackParamList>();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'BrunoAce-Regular': require('./assets/Fonts/BrunoAceSC-Regular.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue without custom fonts
      }
    };

    loadFonts();
  }, []);

  const appTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#00FF00',
      background: '#0A0E27',
      surface: '#1B1F3B',
      onSurface: '#FFFFFF',
      onBackground: '#FFFFFF',
      outline: '#616161',
      error: '#F44336',
    },
    fonts: {
      ...MD3DarkTheme.fonts,
      default: {
        fontFamily: 'BrunoAce-Regular',
        fontWeight: 'normal',
      },
      displayLarge: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 57,
        fontWeight: 'normal',
        lineHeight: 64,
      },
      displayMedium: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 45,
        fontWeight: 'normal',
        lineHeight: 52,
      },
      displaySmall: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 36,
        fontWeight: 'normal',
        lineHeight: 44,
      },
      headlineLarge: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 32,
        fontWeight: 'normal',
        lineHeight: 40,
      },
      headlineMedium: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 28,
        fontWeight: 'normal',
        lineHeight: 36,
      },
      headlineSmall: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 24,
        fontWeight: 'normal',
        lineHeight: 32,
      },
      titleLarge: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 22,
        fontWeight: 'normal',
        lineHeight: 28,
      },
      titleMedium: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 16,
        fontWeight: '500',
        lineHeight: 24,
      },
      titleSmall: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
      },
      bodyLarge: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 16,
        fontWeight: 'normal',
        lineHeight: 24,
      },
      bodyMedium: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 14,
        fontWeight: 'normal',
        lineHeight: 20,
      },
      bodySmall: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 12,
        fontWeight: 'normal',
        lineHeight: 16,
      },
      labelLarge: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
      },
      labelMedium: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
      },
      labelSmall: {
        fontFamily: 'BrunoAce-Regular',
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
      },
    },
  };

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0A0E27',
              },
              headerTintColor: '#00FF00',
              headerTitleStyle: {
                fontWeight: '700',
              },
              headerShown: true,
            }}
          >
            <Stack.Screen 
              name="Landing" 
              component={LandingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{ title: 'Sign In' }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Stack.Screen 
              name="UserDashboard" 
              component={UserDashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="GuestSetup"
              component={GuestSetupScreen}
              options={{ title: 'Guest Setup' }}
            />
            <Stack.Screen
              name="CreateGame"
              component={CreateGameScreen}
              options={{ title: 'Create Game' }}
            />
            <Stack.Screen
              name="JoinGame"
              component={JoinGameScreen}
              options={{ title: 'Join Game' }}
            />
            <Stack.Screen
              name="GameModeSelector"
              component={GameModeSelectorScreen}
              options={{ title: 'Game Mode' }}
            />
            <Stack.Screen
              name="CustomGame"
              component={CustomGameScreen}
              options={{ title: 'Custom Game' }}
            />
            <Stack.Screen
              name="Lobby"
              component={LobbyScreen}
              options={{ title: 'Lobby' }}
            />
            <Stack.Screen
              name="QrScanner"
              component={QrScannerScreen}
              options={{ title: 'Scan QR' }}
            />
            <Stack.Screen
              name="GameSetup"
              component={GameSetupScreen}
              options={{ title: 'Game Setup' }}
            />
            <Stack.Screen
              name="PlayerRole"
              component={PlayerRoleScreen}
              options={{ title: 'Your Role' }}
            />
            <Stack.Screen
              name="NightPhase"
              component={NightPhaseScreen}
              options={{ title: 'Night Phase' }}
            />
            <Stack.Screen
              name="DayPhase"
              component={DayPhaseScreen}
              options={{ title: 'Day Phase' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}