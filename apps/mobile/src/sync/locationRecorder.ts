import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getDb } from '../data/db/expoDb';
import { migrate } from '@danbro96/lupira-expo-sqlite/migrate';
import { MIGRATIONS } from '../data/db/schema';
import { enqueueFix, lastUploadAt, queueDepth, recorderCursor, setRecorderCursor } from '../data/locationQueue';
import { readTrackingSettings } from '../data/locationSettings';
import {
  KEEP_SPACING_MS, MAX_USEFUL_ACCURACY_M, RECORDING, admitFix, classifyActivity, effectiveSpeedMps,
  isTimestampAcceptable, shouldUploadAfterRecord, type SeenFix,
} from '../domain/locationFix';
import { batteryPct } from '../data/battery';
import { detach, logDebug } from '@danbro96/lupira-expo-diagnostics/log';
import { runLocationUpload } from './locationUploader';
import { useTrackingStatus } from './locationTrackingStatus';

/** The recorder: OS location updates → SQLite queue. Runs under a foreground service so it survives
 *  the app being backgrounded; the uploader drains separately.
 *
 *  The OS request never changes (see `RECORDING`); per-activity spacing is applied here, so nothing depends on
 *  re-configuring the request from the background. */

const TASK_NAME = 'lupira-location-track';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    logDebug('location', `task error: ${error.message}`);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length === 0) return;

  try {
    await recordFixes(locations);
  } catch (e) {
    logDebug('location', `record failed: ${String(e)}`);
  }
});

async function recordFixes(locations: Location.LocationObject[]): Promise<void> {
  const db = await getDb();
  await migrate(db, MIGRATIONS);   // the task can run before any UI has mounted

  const now = Date.now();
  // Read once per batch, not per fix — the server only surfaces it on /location/current anyway.
  const battery = await batteryPct();

  const recorded = await db.exclusive(async (tx) => {
    // Checked inside the write so an account reset that disables tracking can't be overtaken by this insert.
    const settings = await readTrackingSettings(tx);
    if (!settings.enabled || settings.paused) return null;
    let { seen, keptMs } = await recorderCursor(tx);
    for (const location of locations) {
      const ts = new Date(location.timestamp).toISOString();
      // A fix the server would reject outright is never worth queue space.
      if (!isTimestampAcceptable(ts, now)) continue;
      const accuracy = location.coords.accuracy;
      // Above this the server drops the fix from stats AND the visit/trip rollup — it would upload
      // as dead weight and could not produce a visit.
      if (accuracy != null && accuracy > MAX_USEFUL_ACCURACY_M) continue;

      const current: SeenFix = { ms: location.timestamp, lat: location.coords.latitude, lon: location.coords.longitude, accuracyM: accuracy };
      const activity = classifyActivity(effectiveSpeedMps(location.coords.speed, seen, current));
      seen = current;
      if (!admitFix(keptMs, location.timestamp, KEEP_SPACING_MS[activity])) continue;
      keptMs = location.timestamp;
      await enqueueFix(tx, {
        ts,
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracyM: accuracy,
        altitudeM: location.coords.altitude,
        headingDeg: location.coords.heading,
        speedMps: location.coords.speed,
        activity,
        provider: 'Fused',
        batteryPct: battery,
        isMoving: activity !== 'Still' && activity !== 'Unknown',
        isMock: location.mocked === true,
      });
    }
    await setRecorderCursor(tx, { seen, keptMs });
    const uploadedAt = await lastUploadAt(tx);
    return { queued: await queueDepth(tx), lastUploadMs: uploadedAt ? Date.parse(uploadedAt) : null };
  });
  if (!recorded) return;

  await useTrackingStatus.getState().refresh(db);
  if (shouldUploadAfterRecord(recorded.queued, recorded.lastUploadMs, Date.now())) detach(runLocationUpload(db), 'location');
}

async function startUpdates(): Promise<void> {
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: RECORDING.timeIntervalMs,
    distanceInterval: RECORDING.distanceIntervalM,
    // Read as a Number even from options restored after a process restart, unlike timeInterval.
    deferredUpdatesInterval: RECORDING.deferredUpdatesIntervalMs,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Lupira is recording your route',
      notificationBody: 'Tap to open. Turn off in Settings → Location tracking.',
      killServiceOnDestroy: false,
    },
  });
}

export async function isRecording(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TASK_NAME);
}

/** Arms tracking. MUST be called from the foreground: Android refuses to start a foreground service
 *  for a backgrounded app. Assumes permissions are already granted (see the tracking store). */
export async function startRecording(): Promise<void> {
  const wasRecording = await isRecording();
  // Re-issued even when live, so the OS request always matches `RECORDING`.
  await startUpdates();
  useTrackingStatus.getState().set({ recording: true });
  logDebug('location', wasRecording ? 'recording re-applied' : 'recording started');
}

export async function stopRecording(): Promise<void> {
  if (await isRecording()) await Location.stopLocationUpdatesAsync(TASK_NAME);
  useTrackingStatus.getState().set({ recording: false });
  logDebug('location', 'recording stopped');
}
