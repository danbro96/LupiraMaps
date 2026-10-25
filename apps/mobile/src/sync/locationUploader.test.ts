import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openNodeDb } from '@danbro96/lupira-expo-sqlite/node';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import { MIGRATIONS } from '../data/db/schema';
import { setMeta } from '../data/db/meta';

const secrets: Record<string, string> = {
  'lupira.maps.location.deviceId': 'dev-1',
  'lupira.maps.location.apiKey': 'key-1',
};
vi.mock('expo-secure-store', () => ({
  getItemAsync: (k: string) => Promise.resolve(secrets[k] ?? null),
  deleteItemAsync: () => Promise.resolve(),
}));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.0.0' } } }));
vi.mock('@danbro96/lupira-expo-diagnostics/log', () => ({ logDebug: vi.fn() }));

const getDb = vi.fn();
vi.mock('../data/db/expoDb', () => ({ getDb: () => getDb() }));

const { runLocationUpload } = await import('./locationUploader');
const { useTrackingStatus } = await import('./locationTrackingStatus');

beforeEach(() => {
  useTrackingStatus.setState({ lastError: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('runLocationUpload', () => {
  it('resolves and reports the failure when the tracking settings cannot be read', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    await db.exclusive((tx) => setMeta(tx, 'location.trackingSettings', '{not json'));

    await expect(runLocationUpload(db)).resolves.toBeUndefined();

    expect(useTrackingStatus.getState().lastError).toMatch(/SyntaxError/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolves and reports the failure when the database cannot be opened', async () => {
    getDb.mockRejectedValueOnce(new Error('disk I/O error'));

    await expect(runLocationUpload()).resolves.toBeUndefined();

    expect(useTrackingStatus.getState().lastError).toBe('Error: disk I/O error');
  });
});
