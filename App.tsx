import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';

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
import GameSetupScreen from './src/screens/GameSetupScreen';
import PlayerRoleScreen from './src/screens/PlayerRoleScreen';
import NightPhaseScreen from './src/screens/NightPhaseScreen';
import DayPhaseScreen from './src/screens/DayPhaseScreen';

const Stack = createStackNavigator<NavigationStackParamList>();

export default function App() {
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
  };

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
              headerShown: false,
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
              options={{ headerShown: false }}
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