import { describe, expect, it } from 'vitest';
import { findSavedPlace, linkPlan, orderSavedPlaces, type SavedPlaceRow } from './savedPlaces';

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

describe('linkPlan', () => {
  const raw: SavedPlaceRow = { ...row('r', 'Pin'), notes: 'Gate code 1234' };

  it('links the raw spot when no other saved place labels the place', () => {
    expect(linkPlan([raw, row('s1', 'Home', true, 'p1')], raw, 'p2')).toEqual({ kind: 'link' });
  });

  it('merges into the saved place already labelling it, appending the notes', () => {
    const home = { ...row('s1', 'Home', true, 'p1'), notes: 'Blue door' };
    expect(linkPlan([raw, home], raw, 'p1')).toEqual({ kind: 'merge', into: home, patch: { notes: 'Blue door\n\nGate code 1234' } });
    expect(linkPlan([raw, row('s1', 'Home', true, 'p1')], raw, 'p1')).toMatchObject({ patch: { notes: 'Gate code 1234' } });
  });

  it('carries nothing when the raw spot has no notes', () => {
    const bare = { ...raw, notes: '  ' };
    expect(linkPlan([bare, row('s1', 'Home', true, 'p1')], bare, 'p1')).toMatchObject({ kind: 'merge', patch: null });
  });

  it('does not append notes the kept entry already holds, so a retried merge is idempotent', () => {
    const merged = { ...row('s1', 'Home', true, 'p1'), notes: 'Blue door\n\nGate code 1234' };
    expect(linkPlan([raw, merged], raw, 'p1')).toMatchObject({ kind: 'merge', patch: null });
  });

  it('keeps the star when a favorite spot merges into a non-favorite entry', () => {
    const fav = { ...raw, isFavorite: true };
    const home = { ...row('s1', 'Home', false, 'p1'), notes: 'Gate code 1234' };
    expect(linkPlan([fav, home], fav, 'p1')).toMatchObject({ patch: { isFavorite: true } });
    expect(linkPlan([fav, row('s1', 'Home', false, 'p1')], fav, 'p1'))
      .toMatchObject({ patch: { notes: 'Gate code 1234', isFavorite: true } });
    expect(linkPlan([raw, home], raw, 'p1')).toMatchObject({ patch: null });
  });
});
