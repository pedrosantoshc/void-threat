import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';

import { NavigationStackParamList } from './src/types';
import LandingScreen from './src/screens/LandingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import GuestSetupScreen from './src/screens/GuestSetupScreen';
import CreateGameScreen from './src/screens/CreateGameScreen';
import JoinGameScreen from './src/screens/JoinGameScreen';

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
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
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
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}