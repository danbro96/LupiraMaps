import { NavigationContainer } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/state/auth-store';
import { ConfirmDialogHost } from '@danbro96/lupira-expo-paper/components/ConfirmDialog';
import { ToastHost } from '@danbro96/lupira-expo-paper/components/ToastHost';
import { navDark, navLight, paperDark, paperLight } from './src/ui/theme/paperTheme';
import { useLocationTracking } from './src/state/location-tracking-store';
import { usePrefs } from './src/state/prefs-store';
import { registerBackgroundUpload } from './src/sync/backgroundTask';
import { persistOptions, queryClient } from './src/sync/queryClient';
import { startReachability } from './src/sync/reachability';
import { RootStack } from './src/ui/navigation/RootStack';
import { linking } from './src/ui/navigation/linking';
import { logDebug } from '@danbro96/lupira-expo-diagnostics/log';
import { useAutoUpdate } from '@danbro96/lupira-expo-diagnostics/useAutoUpdate';
import { paperSettings } from '@danbro96/lupira-expo-paper/theme/paperSettings';
import { SENTRY_DSN } from './src/config';
import { initSentry } from '@danbro96/lupira-expo-diagnostics/initSentry';

initSentry(SENTRY_DSN);

export default function App() {
  useAutoUpdate();
  const scheme = useColorScheme();
  const loaded = useAuth((s) => s.loaded);
  const authed = useAuth((s) => s.authMode === 'dev' || s.token !== null);

  useEffect(() => {
    void useAuth.getState().load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // The read cache is the signed-in user's; nobody else may see it after a sign-out.
    if (!authed) {
      queryClient.clear();
      return;
    }
    void registerBackgroundUpload();
    usePrefs.getState().init().catch((e) => logDebug('app', `prefs init failed: ${String(e)}`));
    useLocationTracking.getState().init().catch((e) => logDebug('app', `tracking init failed: ${String(e)}`));

    // Tracking self-repair lives here: it may need to RESTART the location foreground service, which
    // Android only permits from the foreground.
    const stopReachability = startReachability();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        useLocationTracking.getState().reconcile().catch((e) => logDebug('app', `tracking reconcile failed: ${String(e)}`));
      }
    });
    return () => {
      stopReachability();
      appState.remove();
    };
  }, [loaded, authed]);

  if (!loaded) return null;   // hydration gate — avoids a login flash over a persisted session
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SafeAreaProvider>
        <PaperProvider theme={scheme === 'dark' ? paperDark : paperLight} settings={paperSettings}>
          <ConfirmDialogHost>
            <NavigationContainer linking={linking} theme={scheme === 'dark' ? navDark : navLight}>
              <StatusBar style="auto" />
              <RootStack />
            </NavigationContainer>
          </ConfirmDialogHost>
          <ToastHost />
        </PaperProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
