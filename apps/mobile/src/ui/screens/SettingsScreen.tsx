import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';
import { List, Switch } from 'react-native-paper';
import { useAuth } from '../../state/auth-store';
import { useLocationTracking } from '../../state/location-tracking-store';
import { usePrefs } from '../../state/prefs-store';
import { useTrackingStatus } from '../../sync/locationTrackingStatus';
import { IdentityHeader } from '@danbro96/lupira-expo-paper/components/IdentityHeader';
import { VersionLine } from '@danbro96/lupira-expo-diagnostics/VersionLine';
import { ICONS } from '../icons';
import type { RootStackParamList } from '../navigation/types';
import { useColors } from '../theme';

const join = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ');

/** Identity, then one row per area with its state in the description, each opening its own screen. Something
 *  that needs you (a failed upload, a missing permission) shows in the warning colour, so nothing has to be
 *  opened to find it. Developer tooling stays behind the debug switch. */
export function SettingsScreen() {
  const c = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authMode, user } = useAuth();
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
    <ScrollView>
      <IdentityHeader
        name={authMode === 'dev' ? 'Dev auto-auth' : user?.name ?? user?.sub ?? 'Signed out'}
        sub={authMode === 'dev' ? 'No sign-in' : user?.name ? user.sub : undefined}
      />

      <List.Subheader>Location</List.Subheader>
      <List.Item
        title="Location"
        description={location}
        descriptionStyle={locationAttention ? attention : undefined}
        left={icon(ICONS.place)}
        right={chevron}
        onPress={() => navigation.navigate('LocationSettings')}
      />

      <List.Subheader>Developer</List.Subheader>
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

      <List.Subheader>About</List.Subheader>
      <VersionLine />
    </ScrollView>
  );
}
