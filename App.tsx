import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationStackParamList } from './src/types';
import { darkTheme } from './src/constants/theme';

// Import screens
import LandingScreen from './src/screens/LandingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import GuestSetupScreen from './src/screens/GuestSetupScreen';
import CreateGameScreen from './src/screens/CreateGameScreen';
import JoinGameScreen from './src/screens/JoinGameScreen';

// Placeholder screen for missing routes
const PlaceholderScreen = ({ route }: any) => {
  const { View, Text, StyleSheet } = require('react-native');
  const { SafeAreaView } = require('react-native-safe-area-context');
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0E27' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#00FF00', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          {route?.name || 'Screen'}
        </Text>
        <Text style={{ color: '#FFFFFF', textAlign: 'center', fontSize: 16 }}>
          This screen is coming soon!
        </Text>
      </View>
    </SafeAreaView>
  );
};

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
            <Stack.Screen 
              name="GameModeSelector" 
              component={PlaceholderScreen}
              options={{ title: 'Game Mode' }}
            />
            <Stack.Screen 
              name="CustomGame" 
              component={PlaceholderScreen}
              options={{ title: 'Custom Game' }}
            />
            <Stack.Screen 
              name="GameSetup" 
              component={PlaceholderScreen}
              options={{ title: 'Game Setup' }}
            />
            <Stack.Screen 
              name="PlayerRole" 
              component={PlaceholderScreen}
              options={{ title: 'Your Role' }}
            />
            <Stack.Screen 
              name="ModeratorDashboard" 
              component={PlaceholderScreen}
              options={{ title: 'Moderator' }}
            />
            <Stack.Screen 
              name="NightPhase" 
              component={PlaceholderScreen}
              options={{ title: 'Night Phase' }}
            />
            <Stack.Screen 
              name="DayPhase" 
              component={PlaceholderScreen}
              options={{ title: 'Day Phase' }}
            />
            <Stack.Screen 
              name="GameEnd" 
              component={PlaceholderScreen}
              options={{ title: 'Game Over' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
