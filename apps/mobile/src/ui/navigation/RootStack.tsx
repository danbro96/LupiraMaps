import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../state/auth-store';
import { useStackScreenOptions } from '@danbro96/lupira-expo-paper/hooks/useStackScreenOptions';
import { HeaderActions } from '@danbro96/lupira-expo-paper/components/HeaderActions';
import { DebugLogScreen } from '@danbro96/lupira-expo-diagnostics/DebugLogScreen';
import { DeveloperScreen } from '../screens/DeveloperScreen';
import { LocationSettingsScreen } from '../screens/LocationSettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MapScreen } from '../screens/MapScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { AccountMenu } from '../components/AccountMenu';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ICONS } from '../icons';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const authed = useAuth((s) => s.authMode === 'dev' || s.token !== null);
  return (
    <Stack.Navigator screenOptions={useStackScreenOptions()}>
      {authed ? (
        <>
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={({ navigation }) => ({
              title: 'Map',
              contentStyle: { paddingBottom: 0 },
              headerRight: () => (
                <View style={styles.headerBtns}>
                  <HeaderActions actions={[{ icon: ICONS.saved, label: 'Saved places', onPress: () => navigation.navigate('Places') }]} />
                  <AccountMenu />
                </View>
              ),
            })}
          />
          <Stack.Screen name="Places" component={PlacesScreen} options={{ title: 'Places' }} />
          <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ title: 'Place' }} />
        </>
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

const styles = StyleSheet.create({
  headerBtns: { flexDirection: 'row', alignItems: 'center' },
});
