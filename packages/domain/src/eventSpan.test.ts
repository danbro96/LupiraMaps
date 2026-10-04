import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDateTime, fmtTime, parseYmd } from '@danbro96/lupira-domain-core/time';
import { fmtEventSpan } from './eventSpan';

describe('fmtEventSpan', () => {
  it('names one day for a single all-day event', () => {
    expect(fmtEventSpan({ isAllDay: true, startDate: '2026-03-12', endDate: '2026-03-12' }))
      .toBe(`All day · ${fmtDate(parseYmd('2026-03-12'))}`);
  });

  it('spans the days of a multi-day all-day event', () => {
    expect(fmtEventSpan({ isAllDay: true, startDate: '2026-03-12', endDate: '2026-03-14' }))
      .toBe(`All day · ${fmtDate(parseYmd('2026-03-12'))} – ${fmtDate(parseYmd('2026-03-14'))}`);
  });

  it('gives a same-day end as a time only', () => {
    const start = new Date(2026, 2, 12, 10, 0);
    const end = new Date(2026, 2, 12, 11, 30);
    expect(fmtEventSpan({ isAllDay: false, startsAt: start.toISOString(), endsAt: end.toISOString() }))
      .toBe(`${fmtDateTime(start)}–${fmtTime(end)}`);
  });

  it('dates an end on another day', () => {
    const start = new Date(2026, 2, 12, 22, 0);
    const end = new Date(2026, 2, 13, 2, 0);
    expect(fmtEventSpan({ isAllDay: false, startsAt: start.toISOString(), endsAt: end.toISOString() }))
      .toBe(`${fmtDateTime(start)} – ${fmtDateTime(end)}`);
  });

  it('is empty without a start', () => {
    expect(fmtEventSpan({ isAllDay: false })).toBe('');
    expect(fmtEventSpan({ isAllDay: true })).toBe('');
  });
});
