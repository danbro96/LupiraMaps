import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../../state/auth-store';
import { SettingsButton } from '@danbro96/lupira-expo-paper/components/SettingsButton';
import { DebugLogScreen } from '@danbro96/lupira-expo-diagnostics/DebugLogScreen';
import { DeveloperScreen } from '../screens/DeveloperScreen';
import { LocationSettingsScreen } from '../screens/LocationSettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MapScreen } from '../screens/MapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const authed = useAuth((s) => s.authMode === 'dev' || s.token !== null);
  return (
    <Stack.Navigator>
      {authed ? (
        <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Map', headerRight: () => <SettingsButton /> }} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} options={{ title: 'Location' }} />
      <Stack.Screen name="DebugLog" component={DebugLogScreen} options={{ title: 'Debug log' }} />
      <Stack.Screen name="Developer" component={DeveloperScreen} options={{ title: 'Developer' }} />
    </Stack.Navigator>
  );
}
