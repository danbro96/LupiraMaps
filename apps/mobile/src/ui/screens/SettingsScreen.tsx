import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Switch, Text } from 'react-native-paper';
import { APP_VERSION } from '../../config';
import { UPDATE_LABEL } from '@danbro96/lupira-expo-diagnostics/buildInfo';
import { useAuth } from '../../state/auth-store';
import { useLocationTracking } from '../../state/location-tracking-store';
import { usePrefs } from '../../state/prefs-store';
import { useTrackingStatus } from '../../sync/locationTrackingStatus';
import { Button } from '@danbro96/lupira-expo-paper/components/Button';
import { ICONS } from '../icons';
import type { RootStackParamList } from '../navigation/types';
import { spacing, useColors } from '../theme';

const join = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/** An index, not a form: one row per area with its state in the description, each opening its own screen —
 *  the sibling apps' pattern. Something that needs you (a failed upload, a missing permission) shows here in
 *  the warning colour, so nothing has to be opened to find it. Developer tooling stays behind the debug switch. */
export function SettingsScreen() {
  const c = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authMode, user, token } = useAuth();
  const prefs = usePrefs();
  const tracking = useLocationTracking();
  const trackStatus = useTrackingStatus();

  const chevron = () => <List.Icon icon={ICONS.chevronRight} />;
  const icon = (name: string) => (p: { color: string; style?: object }) => <List.Icon {...p} icon={name} />;
  const attention = { color: c.warning };

  const locationAttention = tracking.settings.enabled && (!tracking.backgroundGranted || !!trackStatus.lastError);
  const location = !tracking.settings.enabled ? 'Off' : join(
    tracking.settings.paused || trackStatus.serverPaused ? 'Paused' : 'Recording',
    trackStatus.queued > 0 && `${trackStatus.queued} waiting`,
    !tracking.backgroundGranted && 'only while the app is open',
    trackStatus.lastError && 'upload failing',
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <List.Item
        title={authMode === 'dev' ? 'Dev auto-auth' : user?.name ?? user?.sub ?? 'Signed out'}
        description={authMode === 'dev' ? 'No sign-in' : user?.name ? user.sub : undefined}
        left={icon(ICONS.account)}
        right={() => (token !== null
          ? <Button title="Sign out" variant="text" onPress={() => void useAuth.getState().clearSession()} />
          : null)}
      />
      <Divider />
      <List.Item
        title="Location"
        description={location}
        descriptionStyle={locationAttention ? attention : undefined}
        left={icon(ICONS.place)}
        right={chevron}
        onPress={() => navigation.navigate('LocationSettings')}
      />
      <Divider />
      <List.Item
        title="Enable debug"
        description="Developer tools and the on-device log"
        left={icon(ICONS.tools)}
        right={() => (
          <Switch
            value={prefs.debugEnabled}
            onValueChange={(v) => void usePrefs.getState().setDebugEnabled(v)}
            accessibilityLabel="Enable debug"
          />
        )}
      />
      {prefs.debugEnabled && (
        <List.Item title="Developer options" left={icon(ICONS.tune)} right={chevron} onPress={() => navigation.navigate('Developer')} />
      )}
      <Text style={[styles.version, { color: c.textSubtle }]}>Lupira Maps {APP_VERSION} · {UPDATE_LABEL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  version: { fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },
});
