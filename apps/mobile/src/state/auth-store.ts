import * as Sentry from '@sentry/react-native';
import * as Crypto from 'expo-crypto';
import { createAuthStore } from '@danbro96/lupira-expo-oidc/authStore';
import { logDebug } from '@danbro96/lupira-expo-diagnostics/log';
import { API_URL_STORAGE_KEY, DEFAULT_API_URL, DEFAULT_AUTH_MODE } from '../config';
import { oidc } from '../data/auth/oidc';
import { queryClient } from '../sync/queryClient';
import { useLocationTracking } from './location-tracking-store';

/** Pseudonymous Sentry identity: SHA-256 of the email (sendDefaultPii is off). Null clears it. */
async function setSentryUser(sub: string | null): Promise<void> {
  if (!sub) {
    Sentry.setUser(null);
    return;
  }
  try {
    Sentry.setUser({ id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, sub) });
  } catch {
    // Leave it unset rather than risk sending the raw email.
  }
}

export const useAuth = createAuthStore({
  keyPrefix: 'lupira.maps',
  storageKeys: { apiUrl: API_URL_STORAGE_KEY },
  defaultApiUrl: DEFAULT_API_URL,
  defaultAuthMode: DEFAULT_AUTH_MODE,
  oidc,
  log: logDebug,
  onAccountChange: async () => {
    queryClient.clear();
    await useLocationTracking.getState().resetForNewAccount();
  },
});

useAuth.subscribe((s, prev) => { if (s.user?.sub !== prev.user?.sub) void setSentryUser(s.user?.sub ?? null); });
