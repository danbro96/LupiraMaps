// The saved-places list. Field names mirror geo's SavedPlaceDto so rows pass structurally.

export interface SavedPlaceRow {
  id: string;
  placeId?: string | null;
  label: string;
  isFavorite: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

/** Favorites first, then by label. */
export function orderSavedPlaces<T extends SavedPlaceRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) =>
    Number(b.isFavorite) - Number(a.isFavorite) || a.label.localeCompare(b.label, 'sv'));
}

/** The saved place a detail screen is about: by its own id, else the one labelling that gazetteer place. */
export function findSavedPlace<T extends SavedPlaceRow>(
  rows: readonly T[],
  { savedPlaceId, placeId }: { savedPlaceId?: string | null; placeId?: string | null },
): T | null {
  if (savedPlaceId) return rows.find((r) => r.id === savedPlaceId) ?? null;
  if (placeId) return rows.find((r) => r.placeId === placeId) ?? null;
  return null;
}
