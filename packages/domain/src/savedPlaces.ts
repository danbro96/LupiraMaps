// The saved-places list. Field names mirror geo's SavedPlaceDto so rows pass structurally.

export interface SavedPlaceRow {
  id: string;
  placeId?: string | null;
  label: string;
  notes?: string | null;
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

export interface MergePatch {
  notes?: string;
  isFavorite?: true;
}

export type LinkPlan<T> = { kind: 'link' } | { kind: 'merge'; into: T; patch: MergePatch | null };

/** A raw spot linked to a place another saved entry already labels folds into that entry, which gets the raw notes
 *  appended unless it already holds them (retry-safe) and keeps either's favorite (`patch` null = nothing to carry); the raw entry goes. */
export function linkPlan<T extends SavedPlaceRow>(rows: readonly T[], raw: T, placeId: string): LinkPlan<T> {
  const into = rows.find((r) => r.id !== raw.id && r.placeId === placeId);
  if (!into) return { kind: 'link' };
  const carried = raw.notes?.trim();
  const patch: MergePatch = {};
  if (carried && !into.notes?.includes(carried)) patch.notes = [into.notes?.trim(), carried].filter(Boolean).join('\n\n');
  if (raw.isFavorite && !into.isFavorite) patch.isFavorite = true;
  return { kind: 'merge', into, patch: Object.keys(patch).length ? patch : null };
}
