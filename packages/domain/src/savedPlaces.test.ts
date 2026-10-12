import { describe, expect, it } from 'vitest';
import { findSavedPlace, orderSavedPlaces, type SavedPlaceRow } from './savedPlaces';

const row = (id: string, label: string, isFavorite = false, placeId: string | null = null): SavedPlaceRow =>
  ({ id, label, isFavorite, placeId });

describe('orderSavedPlaces', () => {
  it('puts favorites first, then sorts by label', () => {
    const ordered = orderSavedPlaces([row('a', 'Örebro'), row('b', 'Gym', true), row('c', 'Arbete'), row('d', 'Bad', true)]);
    expect(ordered.map((r) => r.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

describe('findSavedPlace', () => {
  const rows = [row('s1', 'Home', true, 'p1'), row('s2', 'Pin')];

  it('finds by saved-place id first', () => {
    expect(findSavedPlace(rows, { savedPlaceId: 's2', placeId: 'p1' })?.id).toBe('s2');
  });

  it('falls back to the saved place labelling a gazetteer place', () => {
    expect(findSavedPlace(rows, { placeId: 'p1' })?.id).toBe('s1');
    expect(findSavedPlace(rows, { placeId: 'p9' })).toBeNull();
  });
});
