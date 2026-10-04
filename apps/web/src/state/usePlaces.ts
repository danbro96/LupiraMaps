import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetItemsByPlace } from '@lupira/maps-api/query/cal';
import { createPlace, getGetPlaceQueryKey, useGetPlace } from '@lupira/maps-api/query/geo';

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
