import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openNodeDb } from '@danbro96/lupira-expo-sqlite/node';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import type { Db } from '@danbro96/lupira-expo-sqlite/types';
import { MIGRATIONS } from '../data/db/schema';
import { getMeta } from '../data/db/meta';

let db: Db;
vi.mock('../data/db/expoDb', () => ({ getDb: () => Promise.resolve(db) }));

const { usePrefs } = await import('./prefs-store');

beforeEach(async () => {
  db = openNodeDb();
  await migrate(db, MIGRATIONS);
  await usePrefs.getState().init();
});

describe('prefs store', () => {
  it('persists a change', async () => {
    await usePrefs.getState().setMapSince('year');

    expect(usePrefs.getState().mapSince).toBe('year');
    expect(await getMeta(db, 'prefs.mapSince')).toBe('year');
  });

  it('restores the previous value and rethrows when the save fails', async () => {
    await usePrefs.getState().setMapLayers({ photos: false });
    vi.spyOn(db, 'exclusive').mockRejectedValueOnce(new Error('disk full'));

    await expect(usePrefs.getState().setMapLayers({ photos: true })).rejects.toThrow('disk full');

    expect(usePrefs.getState().mapLayers).toEqual({ photos: false });
    expect(await getMeta(db, 'prefs.mapLayers')).toBe('{"photos":false}');
  });
});
