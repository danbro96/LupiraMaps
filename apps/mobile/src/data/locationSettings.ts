import type { Db, Tx } from '@danbro96/lupira-expo-sqlite/types';
import { getMeta, setMeta } from './db/meta';

/** Tracking settings live in the meta table so the recorder and uploader (sync layer) can read them
 *  without importing state/. */

const SETTINGS_KEY = 'location.trackingSettings';

export type TrackingSettings = {
  enabled: boolean;
  /** Local pause. The server has its own kill switch; this one stops the OS updates entirely. */
  paused: boolean;
};

export const defaultTrackingSettings = (): TrackingSettings => ({ enabled: false, paused: false });

export async function readTrackingSettings(tx: Tx): Promise<TrackingSettings> {
  const stored = await getMeta(tx, SETTINGS_KEY);
  if (!stored) return defaultTrackingSettings();
  return { ...defaultTrackingSettings(), ...(JSON.parse(stored) as Partial<TrackingSettings>) };
}

export function loadTrackingSettings(db: Db): Promise<TrackingSettings> {
  return db.exclusive(readTrackingSettings);
}

export async function saveTrackingSettings(db: Db, settings: TrackingSettings): Promise<void> {
  await db.exclusive((tx) => setMeta(tx, SETTINGS_KEY, JSON.stringify(settings)));
}
