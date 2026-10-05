import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openNodeDb } from '@danbro96/lupira-expo-sqlite/node';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import { MIGRATIONS } from '../data/db/schema';
import { enqueueFix, queueDepth } from '../data/locationQueue';
import { saveTrackingSettings } from '../data/locationSettings';

const store = new Map<string, string>();
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.0.0' } } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
  setItemAsync: vi.fn((k: string, v: string) => {
    store.set(k, v);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((k: string) => {
    store.delete(k);
    return Promise.resolve();
  }),
}));
vi.mock('expo-auth-session', () => ({}));
vi.mock('@danbro96/lupira-expo-diagnostics/log', () => ({ logDebug: vi.fn() }));
vi.mock('@sentry/react-native', () => ({ setUser: vi.fn() }));
vi.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: vi.fn(() => Promise.resolve('hash')) }));
vi.mock('../data/auth/oidc', () => ({ oidc: { refreshTokens: vi.fn() } }));

const clearCache = vi.fn();
vi.mock('../sync/queryClient', () => ({ queryClient: { clear: () => clearCache() } }));

const recording = { on: false };
const stopUpdates = vi.fn(() => {
  recording.on = false;
  return Promise.resolve();
});
vi.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: () => Promise.resolve(recording.on),
  stopLocationUpdatesAsync: () => stopUpdates(),
}));
vi.mock('expo-task-manager', () => ({ defineTask: vi.fn() }));
vi.mock('expo-battery', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, PermissionsAndroid: {} }));

let db = openNodeDb();
vi.mock('../data/db/expoDb', () => ({ getDb: () => Promise.resolve(db) }));

import { useAuth } from './auth-store';
import { useLocationTracking } from './location-tracking-store';
import { useTrackingStatus } from '../sync/locationTrackingStatus';

const jwt = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

beforeEach(() => {
  store.clear();
  db = openNodeDb();
  vi.clearAllMocks();
});

describe('auth store', () => {
  it('persists a session under the lupira.maps.* keys and restores it', async () => {
    await useAuth.getState().setSession({ accessToken: jwt({ email: 'a@test' }), refreshToken: 'rt-1', expiresIn: 3600 });
    expect(store.get('lupira.maps.refreshToken')).toBe('rt-1');

    useAuth.setState({ loaded: false, token: null, refreshToken: null, user: null });
    await useAuth.getState().load();
    expect(useAuth.getState()).toMatchObject({ loaded: true, refreshToken: 'rt-1', user: { sub: 'a@test' } });
  });

  it('an account switch stops tracking, forgets the device key and empties the queue before the session lands', async () => {
    await migrate(db, MIGRATIONS);
    await saveTrackingSettings(db, { enabled: true, paused: false });
    await db.exclusive((tx) => enqueueFix(tx, {
      ts: '2026-10-05T12:00:00.000Z', lat: 59.33, lon: 18.07, accuracyM: 8, altitudeM: null, headingDeg: null, speedMps: 0,
      activity: 'Still', provider: 'Fused', batteryPct: null, isMoving: false, isMock: false,
    }));
    store.set('lupira.maps.location.deviceId', 'dev-1');
    store.set('lupira.maps.location.apiKey', 'old-key');
    recording.on = true;
    useLocationTracking.setState({ registered: true, settings: { enabled: true, paused: false } });
    const upload = vi.fn();
    vi.stubGlobal('fetch', upload);

    await useAuth.getState().clearSession();
    await useAuth.getState().setSession({ accessToken: jwt({ email: 'b@test' }), refreshToken: 'rt-2', expiresIn: 3600 });

    expect(clearCache).toHaveBeenCalledOnce();
    expect(stopUpdates).toHaveBeenCalledOnce();
    expect(upload).not.toHaveBeenCalled();
    expect([...store.keys()].filter((k) => k.startsWith('lupira.maps.location.'))).toEqual([]);
    expect(await db.exclusive(queueDepth)).toBe(0);
    expect(useLocationTracking.getState()).toMatchObject({ registered: false, settings: { enabled: false } });
    expect(useTrackingStatus.getState()).toMatchObject({ recording: false, queued: 0 });
  });
});
