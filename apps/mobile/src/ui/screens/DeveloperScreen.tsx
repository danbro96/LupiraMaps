import { DeveloperScreen as DiagnosticsScreen } from '@danbro96/lupira-expo-diagnostics/DeveloperScreen';
import { API_PRESETS, DIAGNOSTIC_ROUTES } from '../../config';
import { useAuth } from '../../state/auth-store';
import { useTrackingStatus } from '../../sync/locationTrackingStatus';
import { useReachability } from '../../sync/reachability';

/** Reachable from Settings and from the login screen (switching backends must not require signing in first). */
export function DeveloperScreen() {
  const { apiUrl, authMode } = useAuth();
  const reachability = useReachability();
  const tracking = useTrackingStatus();
  return (
    <DiagnosticsScreen
      presets={API_PRESETS}
      diagnosticRoutes={DIAGNOSTIC_ROUTES}
      apiUrl={apiUrl}
      authMode={authMode}
      onSelectBackend={(urls, mode) => void useAuth.getState().setBackend(urls, mode)}
      customUrlPlaceholder="http://host:5182"
      syncState={{ ...reachability, tracking }}
    />
  );
}
