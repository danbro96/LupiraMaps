import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const refuse = new Set<string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
  setItemAsync: vi.fn((k: string, v: string) => {
    store.set(k, v);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((k: string) => {
    if (refuse.has(k)) return Promise.reject(new Error('refused'));
    store.delete(k);
    return Promise.resolve();
  }),
}));
vi.mock('@lupira/maps-api/fetch/location', () => ({ registerDevice: vi.fn(), retireDevice: vi.fn(() => Promise.resolve()) }));
vi.mock('@danbro96/lupira-expo-diagnostics/log', () => ({ logDebug: vi.fn() }));

const { clearDeviceCredentials, forgetDevice, loadDevice } = await import('./locationDevice');

beforeEach(() => {
  store.clear();
  refuse.clear();
  store.set('lupira.maps.location.deviceId', 'dev-1');
  store.set('lupira.maps.location.apiKey', 'key-1');
});

describe('credential deletes', () => {
  it('clears both keys', async () => {
    await clearDeviceCredentials();
    expect(await loadDevice()).toBeNull();
  });

  it('finishes when a delete is refused, dropping what it can', async () => {
    refuse.add('lupira.maps.location.apiKey');
    await expect(clearDeviceCredentials()).resolves.toBeUndefined();
    expect(store.has('lupira.maps.location.deviceId')).toBe(false);
    expect(await loadDevice()).toBeNull();
  });

  it('forgetDevice finishes when a delete is refused', async () => {
    refuse.add('lupira.maps.location.deviceId');
    await expect(forgetDevice()).resolves.toBeUndefined();
  });
});
