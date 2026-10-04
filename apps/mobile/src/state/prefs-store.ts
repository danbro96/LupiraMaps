import type { MapSince } from '@lupira/maps-domain/mapWindow';
import { create } from 'zustand';
import { getDb } from '../data/db/expoDb';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import { MIGRATIONS } from '../data/db/schema';
import { getMeta, setMeta } from '../data/db/meta';

/** Small user preferences, persisted in the meta table beside the location settings. */

const DEBUG_KEY = 'prefs.debugEnabled';
const MAP_SINCE_KEY = 'prefs.mapSince';
const MAP_LAYERS_KEY = 'prefs.mapLayers';

export const MAP_SINCE_OPTIONS: readonly MapSince[] = ['week', 'month', 'year', 'all'];
const isMapSince = (v: string | null): v is MapSince => MAP_SINCE_OPTIONS.includes(v as MapSince);

function parseJson<T>(raw: string | null, valid: (v: unknown) => v is T, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v: unknown = JSON.parse(raw);
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
const isFlagRecord = (v: unknown): v is Record<string, boolean> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'boolean');

type Prefs = {
  loaded: boolean;
  /** Gates the Developer + debug-log entries in Settings. */
  debugEnabled: boolean;
  /** How far back the map's dated layers (events, photos, hotspots, movement) reach. */
  mapSince: MapSince;
  /** Map layer toggles the user changed; keys the map doesn't know are ignored. */
  mapLayers: Record<string, boolean>;
};

type PrefsActions = {
  init(): Promise<void>;
  setDebugEnabled(value: boolean): Promise<void>;
  setMapSince(value: MapSince): Promise<void>;
  setMapLayers(value: Record<string, boolean>): Promise<void>;
};

async function save(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.exclusive((tx) => setMeta(tx, key, value));
}

export const usePrefs = create<Prefs & PrefsActions>((set) => ({
  loaded: false,
  debugEnabled: false,
  mapSince: 'month',
  mapLayers: {},

  init: async () => {
    const db = await getDb();
    await migrate(db, MIGRATIONS);
    set({
      debugEnabled: (await getMeta(db, DEBUG_KEY)) === '1',
      mapSince: await getMeta(db, MAP_SINCE_KEY).then((v) => (isMapSince(v) ? v : 'month')),
      mapLayers: parseJson(await getMeta(db, MAP_LAYERS_KEY), isFlagRecord, {}),
      loaded: true,
    });
  },

  setDebugEnabled: async (value) => {
    set({ debugEnabled: value });
    await save(DEBUG_KEY, value ? '1' : '0');
  },

  setMapSince: async (value) => {
    set({ mapSince: value });
    await save(MAP_SINCE_KEY, value);
  },

  setMapLayers: async (value) => {
    set({ mapLayers: value });
    await save(MAP_LAYERS_KEY, JSON.stringify(value));
  },
}));
