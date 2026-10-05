import { expect, it, vi } from 'vitest';
import { openNodeDb } from '@danbro96/lupira-expo-sqlite/node';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import { MIGRATIONS } from '../data/db/schema';
import { queueDepth } from '../data/locationQueue';
import { saveTrackingSettings } from '../data/locationSettings';

const tasks = new Map<string, (body: { data: unknown; error: null }) => Promise<void>>();
vi.mock('expo-task-manager', () => ({ defineTask: (name: string, fn: never) => tasks.set(name, fn) }));
vi.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: () => Promise.resolve(false),
  stopLocationUpdatesAsync: vi.fn(),
}));
let releaseBattery!: (level: number) => void;
vi.mock('expo-battery', () => ({ getBatteryLevelAsync: () => new Promise((r) => { releaseBattery = r; }) }));
vi.mock('expo-secure-store', () => ({ getItemAsync: () => Promise.resolve(null), deleteItemAsync: () => Promise.resolve() }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.0.0' } } }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, PermissionsAndroid: {} }));
vi.mock('@danbro96/lupira-expo-diagnostics/log', () => ({ logDebug: vi.fn() }));

const db = openNodeDb();
vi.mock('../data/db/expoDb', () => ({ getDb: () => Promise.resolve(db) }));

await import('../sync/locationRecorder');
const { useLocationTracking } = await import('./location-tracking-store');

it('a recorder write that started before an account reset never lands after the queue is emptied', async () => {
  await migrate(db, MIGRATIONS);
  await saveTrackingSettings(db, { enabled: true, paused: false });
  const [record] = tasks.values();

  const recording = record({
    data: { locations: [{ timestamp: Date.now(), coords: { latitude: 59.33, longitude: 18.07, accuracy: 8, altitude: null, heading: null, speed: 0 } }] },
    error: null,
  });
  await vi.waitFor(() => expect(releaseBattery).toBeTypeOf('function'));
  await useLocationTracking.getState().resetForNewAccount();
  releaseBattery(0.5);
  await recording;

  expect(await db.exclusive(queueDepth)).toBe(0);
});
