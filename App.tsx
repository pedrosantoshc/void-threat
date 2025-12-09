import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationStackParamList } from './src/types';
import { darkTheme } from './src/constants/theme';

// Import screens (to be created)
import LandingScreen from './src/screens/LandingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import GuestSetupScreen from './src/screens/GuestSetupScreen';
import CreateGameScreen from './src/screens/CreateGameScreen';
import JoinGameScreen from './src/screens/JoinGameScreen';

const Stack = createStackNavigator<NavigationStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={darkTheme}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0A0E27" />
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0A0E27',
              },
              headerTintColor: '#00FF00',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerShown: false, // We'll handle headers within screens for custom design
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
              options={{ title: 'Void Threat' }}
            />
            <Stack.Screen 
              name="GuestSetup" 
              component={GuestSetupScreen}
              options={{ title: 'Choose Your Identity' }}
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
