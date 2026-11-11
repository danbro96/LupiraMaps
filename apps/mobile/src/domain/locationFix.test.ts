import { describe, expect, it } from 'vitest';
import {
  KEEP_SPACING_MS, RECORDING, UPLOAD_MAX_AGE_MS, UPLOAD_MIN_ROWS, admitFix, classifyActivity, effectiveSpeedMps,
  isTimestampAcceptable, receiptIsCoherent, rejectDisposition, shouldUploadAfterRecord, toNdjsonLine,
  type LocationFix, type SeenFix,
} from './locationFix';

const NOW = Date.parse('2026-08-30T12:00:00.000Z');

const fix = (over: Partial<LocationFix> = {}): LocationFix => ({
  seq: 1,
  ts: '2026-08-30T11:59:00.000Z',
  lat: 59.33,
  lon: 18.07,
  accuracyM: 8,
  altitudeM: 21,
  headingDeg: 180,
  speedMps: 1.4,
  activity: 'Walk',
  provider: 'Fused',
  batteryPct: 72,
  isMoving: true,
  isMock: false,
  ...over,
});

describe('classifyActivity', () => {
  it('maps the speed ladder', () => {
    expect(classifyActivity(0)).toBe('Still');
    expect(classifyActivity(1.3)).toBe('Walk');
    expect(classifyActivity(3.2)).toBe('Run');
    expect(classifyActivity(6)).toBe('Cycle');
    expect(classifyActivity(25)).toBe('Vehicle');
  });

  it('is Unknown without a usable speed', () => {
    expect(classifyActivity(null)).toBe('Unknown');
    expect(classifyActivity(-1)).toBe('Unknown');
  });
});

describe('effectiveSpeedMps', () => {
  const at = (ms: number, north: number, accuracyM: number | null = 8): SeenFix =>
    ({ ms, lat: 59.33 + north / 111_320, lon: 18.07, accuracyM });

  it('trusts a reported speed', () => {
    expect(effectiveSpeedMps(1.4, at(NOW, 0), at(NOW + 60_000, 0))).toBe(1.4);
  });

  it('derives speed from displacement when the OS reports 0', () => {
    expect(effectiveSpeedMps(0, at(NOW, 0), at(NOW + 60_000, 300))).toBeCloseTo(5, 1);
  });

  it('reads a move within the fixes\' accuracy as standing still', () => {
    expect(effectiveSpeedMps(0, at(NOW, 0, 30), at(NOW + 60_000, 25, 30))).toBe(0);
  });

  it('has nothing to compare with on the first fix', () => {
    expect(effectiveSpeedMps(null, null, at(NOW, 0))).toBeNull();
    expect(effectiveSpeedMps(0, null, at(NOW, 0))).toBe(0);
  });
});

describe('KEEP_SPACING_MS', () => {
  it('thins a parked phone to five minutes and keeps every moving fix', () => {
    expect(KEEP_SPACING_MS.Still).toBe(300_000);
    expect(KEEP_SPACING_MS.Walk).toBe(RECORDING.timeIntervalMs);
    expect(KEEP_SPACING_MS.Vehicle).toBe(RECORDING.timeIntervalMs);
  });
});

describe('admitFix', () => {
  const interval = 300_000;

  it('always keeps the first fix', () => {
    expect(admitFix(null, NOW, interval)).toBe(true);
  });

  it('drops fixes that arrive faster than the profile', () => {
    expect(admitFix(NOW, NOW + 10_000, interval)).toBe(false);
    expect(admitFix(NOW, NOW, interval)).toBe(false);
  });

  it('keeps an on-time fix despite delivery jitter', () => {
    expect(admitFix(NOW, NOW + interval - 5_000, interval)).toBe(true);
  });

  it('keeps the first fix after a gap', () => {
    expect(admitFix(NOW, NOW + 3 * 3_600_000, interval)).toBe(true);
  });

  it('treats a clock that jumped backwards as a gap', () => {
    expect(admitFix(NOW, NOW - 2 * interval, interval)).toBe(true);
  });
});

describe('shouldUploadAfterRecord', () => {
  it('waits while the batch is small and the last upload recent', () => {
    expect(shouldUploadAfterRecord(3, NOW - 60_000, NOW)).toBe(false);
  });

  it('uploads once enough rows are queued', () => {
    expect(shouldUploadAfterRecord(UPLOAD_MIN_ROWS, NOW - 60_000, NOW)).toBe(true);
  });

  it('uploads once the last upload is old enough', () => {
    expect(shouldUploadAfterRecord(1, NOW - UPLOAD_MAX_AGE_MS, NOW)).toBe(true);
  });

  it('uploads when nothing was ever uploaded or the clock went backwards', () => {
    expect(shouldUploadAfterRecord(1, null, NOW)).toBe(true);
    expect(shouldUploadAfterRecord(1, NOW + 60_000, NOW)).toBe(true);
  });

  it('never uploads an empty queue', () => {
    expect(shouldUploadAfterRecord(0, null, NOW)).toBe(false);
  });
});

describe('toNdjsonLine', () => {
  it('emits snake_case keys the ingest parser understands', () => {
    const line = JSON.parse(toNdjsonLine(fix())) as Record<string, unknown>;
    expect(line).toMatchObject({
      seq: 1, ts: '2026-08-30T11:59:00.000Z', lat: 59.33, lon: 18.07,
      accuracy_m: 8, altitude_m: 21, heading_deg: 180, speed_mps: 1.4,
      activity: 'Walk', provider: 'Fused', battery_pct: 72, is_moving: true,
    });
  });

  it('never emits identity fields — the server rejects the whole line if it sees them', () => {
    const serialized = toNdjsonLine(fix());
    for (const forbidden of ['principal_id', 'principalId', 'device_id', 'deviceId']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('omits nulls and a false is_mock rather than sending them', () => {
    const line = JSON.parse(toNdjsonLine(fix({
      accuracyM: null, altitudeM: null, headingDeg: null, speedMps: null, batteryPct: null,
    }))) as Record<string, unknown>;
    expect(Object.keys(line).sort()).toEqual(['activity', 'is_moving', 'lat', 'lon', 'provider', 'seq', 'ts']);
  });

  it('marks mock fixes so the server can exclude them from the rollup', () => {
    expect(JSON.parse(toNdjsonLine(fix({ isMock: true })))).toMatchObject({ is_mock: true });
  });

  it('serializes the timestamp byte-identically on every call — (ts, seq) is half the server PK', () => {
    const f = fix();
    expect(toNdjsonLine(f)).toBe(toNdjsonLine(f));
  });
});

describe('rejectDisposition', () => {
  it('drops rejects that can never succeed', () => {
    expect(rejectDisposition('invalid_latlon', fix().ts, NOW)).toBe('drop');
    expect(rejectDisposition('body_ids_forbidden', fix().ts, NOW)).toBe('drop');
    expect(rejectDisposition('missing_seq', fix().ts, NOW)).toBe('drop');
  });

  it('retains a truncated batch — the row itself was never judged', () => {
    expect(rejectDisposition('batch_too_large', fix().ts, NOW)).toBe('retain');
  });

  it('defers a future timestamp, because a fast clock catches up', () => {
    const ts = new Date(NOW + 30 * 60_000).toISOString();
    const d = rejectDisposition('ts_out_of_range', ts, NOW);
    expect(d).not.toBe('drop');
    expect(Date.parse((d as { deferUntil: string }).deferUntil)).toBeGreaterThan(NOW);
  });

  it('drops a wildly future or expired timestamp', () => {
    expect(rejectDisposition('ts_out_of_range', new Date(NOW + 5 * 86_400_000).toISOString(), NOW)).toBe('drop');
    expect(rejectDisposition('ts_out_of_range', new Date(NOW - 200 * 86_400_000).toISOString(), NOW)).toBe('drop');
  });
});

describe('receiptIsCoherent', () => {
  it('accepts a receipt whose arithmetic adds up', () => {
    expect(receiptIsCoherent(10, { submitted: 10, inserted: 8, duplicates: 1, rejected: 1 })).toBe(true);
  });

  it('rejects a truncated or re-encoded body', () => {
    expect(receiptIsCoherent(10, { submitted: 7, inserted: 7, duplicates: 0, rejected: 0 })).toBe(false);
    expect(receiptIsCoherent(10, { submitted: 10, inserted: 5, duplicates: 0, rejected: 0 })).toBe(false);
  });
});

describe('isTimestampAcceptable', () => {
  it('mirrors the server window so doomed rows never reach the queue', () => {
    expect(isTimestampAcceptable(new Date(NOW - 60_000).toISOString(), NOW)).toBe(true);
    expect(isTimestampAcceptable(new Date(NOW + 10 * 60_000).toISOString(), NOW)).toBe(false);
    expect(isTimestampAcceptable(new Date(NOW - 100 * 86_400_000).toISOString(), NOW)).toBe(false);
    expect(isTimestampAcceptable('not-a-date', NOW)).toBe(false);
  });
});
