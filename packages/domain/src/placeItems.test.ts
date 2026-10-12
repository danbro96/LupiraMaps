import { describe, expect, it } from 'vitest';
import { describePlaceItem, placeItemWhen, placeRole } from './placeItems';

describe('placeRole', () => {
  it('names the place as location or travel endpoint', () => {
    expect(placeRole({ placeId: 'p', isAllDay: false }, 'p')).toBe('At');
    expect(placeRole({ isAllDay: false, details: { travel: { toPlaceId: 'p' } } }, 'p')).toBe('To');
    expect(placeRole({ isAllDay: false, details: { travel: { fromPlaceId: 'p' } } }, 'p')).toBe('From');
    expect(placeRole({ placeId: 'q', isAllDay: false }, 'p')).toBe('');
  });
});

describe('placeItemWhen', () => {
  it('is empty without a start', () => {
    expect(placeItemWhen({ isAllDay: true })).toBe('');
    expect(placeItemWhen({ isAllDay: false })).toBe('');
  });

  it('formats an all-day start as a date', () => {
    expect(placeItemWhen({ isAllDay: true, startDate: '2026-09-01' })).not.toBe('');
  });
});

describe('describePlaceItem', () => {
  it('reads as title, then role', () => {
    expect(describePlaceItem({ title: 'Dentist', placeId: 'p', isAllDay: false }, 'p')).toEqual({ title: 'Dentist', detail: 'At' });
  });
});
