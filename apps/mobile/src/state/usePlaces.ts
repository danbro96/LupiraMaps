import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { ApiError } from '@danbro96/lupira-http/apiError';
import { getItemsByPlace } from '@lupira/maps-api/fetch/cal';
import {
  createSavedPlace, deleteSavedPlace, getPlace, listSavedPlaces, reverseGeocode, updatePlace, updateSavedPlace,
} from '@lupira/maps-api/fetch/geo';
import type {
  CreateSavedPlaceRequest, GeocodeResultDto, UpdatePlaceRequest, UpdateSavedPlaceRequest,
} from '@lupira/maps-api/models';
import type { GeoPoint } from '@danbro96/lupira-domain-places/geo';

const SAVED_PLACES_KEY = ['map', 'saved-places'] as const;

export function useSavedPlaces(enabled = true) {
  return useQuery({ ...onlineQuery(SAVED_PLACES_KEY, () => listSavedPlaces()), enabled });
}

export function useGeoPlace(placeId: string | null | undefined) {
  return useQuery({ ...onlineQuery(['places', 'detail', placeId], () => getPlace(placeId!)), enabled: !!placeId });
}

/** Calendar items anchored to a place (its location, or a travel endpoint). */
export function usePlaceItems(placeId: string | null | undefined) {
  return useQuery({ ...onlineQuery(['places', 'items', placeId], () => getItemsByPlace(placeId!)), enabled: !!placeId });
}

/** A name suggestion for a spot. Not a persisted root: geocoding always goes to the network. */
export function useReverseGeocode(point: GeoPoint | null) {
  return useQuery({
    ...onlineQuery(['geocode', 'reverse', point?.lat, point?.lon], async (): Promise<GeocodeResultDto | null> => {
      try {
        return await reverseGeocode({ lat: point!.lat, lon: point!.lon });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }),
    enabled: point !== null,
  });
}

function useInvalidatePlaces() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: SAVED_PLACES_KEY }),
    queryClient.invalidateQueries({ queryKey: ['places'] }),
  ]);
}

export function useCreateSavedPlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({ mutationFn: (data: CreateSavedPlaceRequest) => createSavedPlace(data), onSuccess: invalidate });
}

export function useUpdateSavedPlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavedPlaceRequest }) => updateSavedPlace(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSavedPlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({ mutationFn: (id: string) => deleteSavedPlace(id), onSuccess: invalidate });
}

export function useUpdatePlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaceRequest }) => updatePlace(id, data),
    onSuccess: invalidate,
  });
}
