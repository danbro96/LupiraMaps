import { useMutation } from '@tanstack/react-query';
import { useGetItemsByPlace } from '@lupira/maps-api/query/cal';
import {
  createPlaceFromPin, deleteSavedPlace, listSavedPlaces, updateSavedPlace, useCreateSavedPlace, useDeleteSavedPlace,
  useGetPlace, useListSavedPlaces, useUpdatePlace, useUpdateSavedPlace,
} from '@lupira/maps-api/query/geo';
import type { SavedPlaceDto } from '@lupira/maps-api/models';
import { findSavedPlace, linkPlan } from '@lupira/maps-domain/savedPlaces';
import { useInvalidatePlaces } from './useInvalidate';

/** A single gazetteer place with its containment chain (outermost→innermost). */
export function useGeoPlace(placeId: string | undefined) {
  return useGetPlace(placeId ?? '', { query: { enabled: !!placeId } });
}

/** Calendar items anchored to a geo place (its location, or a travel endpoint). */
export function usePlaceItems(placeId: string | undefined) {
  return useGetItemsByPlace(placeId ?? '', { query: { enabled: !!placeId } });
}

/** The catalog place at a pin: one within the dedupe radius, else a new one (auto-named when `name` is omitted). */
export function usePlaceFromPin() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: ({ name, lat, lon }: { name?: string | null; lat: number; lon: number }) =>
      createPlaceFromPin({ name, latitude: lat, longitude: lon }),
    onSuccess: () => invalidate(),
  });
}

/** A saved place by its own id, else the one labelling a gazetteer place. */
export function useSavedPlace(ids: { savedPlaceId?: string; placeId?: string }) {
  const q = useListSavedPlaces({ query: { enabled: !!(ids.savedPlaceId || ids.placeId) } });
  return { saved: findSavedPlace(q.data ?? [], ids), isLoading: q.isLoading };
}

/** A raw saved spot becomes a catalog place (matched within the dedupe radius, else created under its label);
 *  `savedPlaceId` is the saved entry labelling it afterwards. */
export function useLinkSavedToPlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: async (saved: SavedPlaceDto): Promise<{ placeId: string; savedPlaceId: string }> => {
      if (saved.latitude == null || saved.longitude == null) throw new Error('The saved place has no coordinates.');
      const place = await createPlaceFromPin({ name: saved.label, latitude: saved.latitude, longitude: saved.longitude });
      if (!place.placeId) throw new Error('No place resolved at the pin.');
      const plan = linkPlan(await listSavedPlaces(), saved, place.placeId);
      if (plan.kind === 'link') {
        await updateSavedPlace(saved.id, { placeId: place.placeId });
        return { placeId: place.placeId, savedPlaceId: saved.id };
      }
      if (plan.patch) await updateSavedPlace(plan.into.id, plan.patch);
      await deleteSavedPlace(saved.id);
      return { placeId: place.placeId, savedPlaceId: plan.into.id };
    },
    onSuccess: () => invalidate(),
  });
}

/** Place and saved-place writes; each refreshes every geo place query. `onError` gets the failure. */
export function usePlaceEdits(onError: (e: unknown) => void) {
  const invalidate = useInvalidatePlaces();
  const mutation = { onSuccess: () => invalidate(), onError };
  return {
    updatePlace: useUpdatePlace({ mutation }),
    createSaved: useCreateSavedPlace({ mutation }),
    updateSaved: useUpdateSavedPlace({ mutation }),
    deleteSaved: useDeleteSavedPlace({ mutation }),
  };
}
