import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetItemsByPlace } from '@lupira/maps-api/query/cal';
import {
  createPlace, getGetPlaceQueryKey, useCreateSavedPlace, useDeleteSavedPlace, useGetPlace, useListSavedPlaces, useUpdatePlace,
  useUpdateSavedPlace,
} from '@lupira/maps-api/query/geo';
import { findSavedPlace } from '@lupira/maps-domain/savedPlaces';
import { useInvalidatePlaces } from './useInvalidate';

/** A single gazetteer place with its containment chain (outermost→innermost). */
export function useGeoPlace(placeId: string | undefined) {
  return useGetPlace(placeId ?? '', { query: { enabled: !!placeId } });
}

/** Calendar items anchored to a geo place (its location, or a travel endpoint). */
export function usePlaceItems(placeId: string | undefined) {
  return useGetItemsByPlace(placeId ?? '', { query: { enabled: !!placeId } });
}

/** Create a place at manually pinned coordinates. */
export function useCreatePlaceAtPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, lat, lon }: { name: string; lat: number; lon: number }) =>
      createPlace({ name, latitude: lat, longitude: lon }),
    onSuccess: (place) => queryClient.setQueryData(getGetPlaceQueryKey(place.id), place),
  });
}

/** The saved place labelling a gazetteer place, if any. */
export function useSavedPlaceFor(placeId: string) {
  const q = useListSavedPlaces();
  return { saved: findSavedPlace(q.data ?? [], { placeId }), isLoading: q.isLoading };
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
