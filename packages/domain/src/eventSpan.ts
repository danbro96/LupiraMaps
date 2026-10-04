import { fmtDate, fmtDateTime, fmtTime, parseYmd, sameDay } from '@danbro96/lupira-domain-core/time';

export interface EventSpan {
  isAllDay: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/** When an event happens, on one line: a day or day range when all-day, else start–end with the end's date
 *  only when it falls on another day. */
export function fmtEventSpan(e: EventSpan): string {
  if (e.isAllDay) {
    if (!e.startDate) return '';
    const start = `All day · ${fmtDate(parseYmd(e.startDate))}`;
    return e.endDate && e.endDate > e.startDate ? `${start} – ${fmtDate(parseYmd(e.endDate))}` : start;
  }
  if (!e.startsAt) return '';
  const start = new Date(e.startsAt);
  if (!e.endsAt) return fmtDateTime(start);
  const end = new Date(e.endsAt);
  return sameDay(start, end) ? `${fmtDateTime(start)}–${fmtTime(end)}` : `${fmtDateTime(start)} – ${fmtDateTime(end)}`;
}
