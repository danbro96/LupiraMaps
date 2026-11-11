import { haversineM } from '@danbro96/lupira-domain-places/geo';

/** GPS recording: the wire shape, activity classification, and the recording request with its queue spacing.
 *  Pure — every rule here is unit-tested, because a mistake costs a day of silently wrong tracks. */

/** Matches LupiraLocationApi's `MotionActivity` enum exactly; sent as the string name. */
export type MotionActivity = 'Unknown' | 'Still' | 'Walk' | 'Run' | 'Cycle' | 'Vehicle';

/** Matches LupiraLocationApi's `LocationProvider` enum. Android's fused provider is what we get. */
export type LocationProvider = 'Unknown' | 'Gps' | 'Network' | 'Fused' | 'Passive';

/** One recorded fix, already in the server's units. `seq` is device-assigned and monotonic; together
 *  with `ts` it forms the server's idempotency key, so neither may change once queued. */
export type LocationFix = {
  seq: number;
  ts: string;
  lat: number;
  lon: number;
  accuracyM: number | null;
  altitudeM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  activity: MotionActivity;
  provider: LocationProvider;
  batteryPct: number | null;
  isMoving: boolean;
  isMock: boolean;
};

/** The server drops fixes worse than this from stats AND from the visit/trip rollup, so anything
 *  above it contributes nothing but storage. Kept as the queue's admission gate. */
export const MAX_USEFUL_ACCURACY_M = 50;

/** expo-location reports no activity — Android's ActivityRecognition API isn't exposed, and
 *  `activityType` is an iOS input hint, not an output. Speed is the only signal we actually have,
 *  so classification is a speed ladder fed by `effectiveSpeedMps`. Thresholds are deliberately wide:
 *  the value drives queue spacing and the map's per-fix colouring. */
export function classifyActivity(speedMps: number | null): MotionActivity {
  if (speedMps == null || speedMps < 0) return 'Unknown';
  if (speedMps < 0.5) return 'Still';
  if (speedMps < 2.2) return 'Walk';
  if (speedMps < 4.5) return 'Run';
  if (speedMps < 8) return 'Cycle';
  return 'Vehicle';
}

/** One fixed OS request, never changed: changing it means re-starting a location foreground service, which Android 12+
 *  forbids while the app is backgrounded. Accuracy stays High — Balanced (~100 m) sits above the server's 50 m cutoff
 *  and would yield no visits. No distance filter: a parked phone must still report, or visits vanish. Backgrounded,
 *  fixes reach JS in batches of about five minutes. */
export const RECORDING = { timeIntervalMs: 60_000, distanceIntervalM: 0, deferredUpdatesIntervalMs: 300_000 } as const;

/** Queue spacing per activity: a parked phone needs one fix per five minutes; anything moving keeps every fix. */
export const KEEP_SPACING_MS: Record<MotionActivity, number> = {
  Unknown: RECORDING.timeIntervalMs,
  Still: 300_000,
  Walk: RECORDING.timeIntervalMs,
  Run: RECORDING.timeIntervalMs,
  Cycle: RECORDING.timeIntervalMs,
  Vehicle: RECORDING.timeIntervalMs,
};

/** A move within this, or within either fix's accuracy, is position jitter rather than motion. */
const MIN_MOVE_M = 10;

export type SeenFix = { ms: number; lat: number; lon: number; accuracyM: number | null };

/** expo-location reports 0, not null, when the OS fix carries no speed, so a 0 is checked against the displacement
 *  since the previous fix. Null when there is nothing to compare with. */
export function effectiveSpeedMps(reportedMps: number | null, prev: SeenFix | null, fix: SeenFix): number | null {
  if (reportedMps != null && reportedMps > 0) return reportedMps;
  if (prev == null || fix.ms <= prev.ms) return reportedMps;
  const moved = haversineM(prev, fix);
  if (moved <= Math.max(prev.accuracyM ?? 0, fix.accuracyM ?? 0, MIN_MOVE_M)) return 0;
  return moved / ((fix.ms - prev.ms) / 1000);
}

/** OS delivery jitters around the requested interval; without slack every other on-time fix is dropped. */
export const FIX_INTERVAL_SLACK = 0.8;

/** Queue admission by spacing. A clock that jumped backwards counts as a gap, or it would block every
 *  fix until wall-clock caught up. */
export function admitFix(lastKeptMs: number | null, fixMs: number, intervalMs: number): boolean {
  if (lastKeptMs == null) return true;
  const elapsed = fixMs - lastKeptMs;
  return elapsed >= intervalMs * FIX_INTERVAL_SLACK || elapsed < -intervalMs;
}

export const UPLOAD_MIN_ROWS = 50;
export const UPLOAD_MAX_AGE_MS = 15 * 60_000;

/** Whether a recorded batch triggers an upload. Each upload wakes the radio, so the recorder waits for
 *  a worthwhile batch; foreground, manual and background-task drains are not gated. */
export function shouldUploadAfterRecord(queued: number, lastUploadMs: number | null, now: number): boolean {
  if (queued === 0) return false;
  if (queued >= UPLOAD_MIN_ROWS || lastUploadMs == null) return true;
  return now - lastUploadMs >= UPLOAD_MAX_AGE_MS || now < lastUploadMs;
}

/** One NDJSON line. Field names are snake_case — the ingest parser's shape, NOT the REST DTOs' camelCase.
 *  Nulls are omitted rather than sent, and identity fields are never included: the server stamps
 *  principal/device from the DeviceKey and rejects any line that carries them (`body_ids_forbidden`). */
export function toNdjsonLine(fix: LocationFix): string {
  const line: Record<string, unknown> = { seq: fix.seq, ts: fix.ts, lat: fix.lat, lon: fix.lon };
  if (fix.accuracyM != null) line.accuracy_m = fix.accuracyM;
  if (fix.altitudeM != null) line.altitude_m = fix.altitudeM;
  if (fix.headingDeg != null) line.heading_deg = fix.headingDeg;
  if (fix.speedMps != null) line.speed_mps = fix.speedMps;
  line.activity = fix.activity;
  line.provider = fix.provider;
  if (fix.batteryPct != null) line.battery_pct = fix.batteryPct;
  line.is_moving = fix.isMoving;
  if (fix.isMock) line.is_mock = true;
  return JSON.stringify(line);
}

/** Rejects that will never succeed on a retry — the row is dropped instead of parked forever.
 *  `batch_too_large` is excluded deliberately: it means the batch was truncated, not that the row is bad.
 *  `ts_out_of_range` is excluded too — see `rejectDisposition`, where a future timestamp is deferrable. */
const PERMANENT_REJECTS = new Set([
  'invalid_json', 'body_ids_forbidden', 'missing_seq',
  'invalid_ts', 'missing_latlon', 'invalid_latlon',
]);

export type RejectDisposition = 'drop' | 'retain' | { deferUntil: string };

/** What to do with one rejected row. A `ts_out_of_range` caused by a clock that was running FAST at
 *  capture time becomes valid as wall-clock catches up, so it is deferred rather than thrown away —
 *  but only within a day, beyond which the clock was wrong enough that the fix would poison the
 *  timeline anyway. Anything older than retention can never be accepted. */
export function rejectDisposition(reason: string, ts: string, now: number): RejectDisposition {
  if (reason === 'batch_too_large') return 'retain';
  if (PERMANENT_REJECTS.has(reason)) return 'drop';
  if (reason !== 'ts_out_of_range') return 'retain';

  const t = Date.parse(ts);
  if (Number.isNaN(t) || t < now - RETENTION_DAYS * 86_400_000) return 'drop';
  if (t > now + 86_400_000) return 'drop';
  // Becomes acceptable once wall-clock passes (ts − the server's 5 min tolerance).
  return { deferUntil: new Date(t - MAX_FUTURE_SKEW_MS + 60_000).toISOString() };
}

/** True when the receipt's own arithmetic doesn't add up — a proxy that truncated or re-encoded the
 *  NDJSON body would otherwise look like a clean ack and silently destroy the batch. */
export function receiptIsCoherent(sentCount: number, r: {
  submitted: number; inserted: number; duplicates: number; rejected: number;
}): boolean {
  return r.submitted === sentCount && r.inserted + r.duplicates + r.rejected === r.submitted;
}

/** The server's window: fixes further ahead than +5 min or older than retention are rejected outright.
 *  Checked before queueing so a device with a bad clock doesn't fill the queue with doomed rows. */
export const MAX_FUTURE_SKEW_MS = 5 * 60_000;
export const RETENTION_DAYS = 90;

export function isTimestampAcceptable(ts: string, now: number): boolean {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return false;
  return t <= now + MAX_FUTURE_SKEW_MS && t >= now - RETENTION_DAYS * 86_400_000;
}
