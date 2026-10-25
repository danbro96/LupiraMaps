import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { ApiError } from '@danbro96/lupira-http/apiError';
import { getItemsByPlace } from '@lupira/maps-api/fetch/cal';
import {
  createPlaceFromPin, createSavedPlace, deleteSavedPlace, getPlace, listSavedPlaces, reverseGeocode, updatePlace,
  updateSavedPlace,
} from '@lupira/maps-api/fetch/geo';
import {
  ReversePrecision, type CreateSavedPlaceRequest, type GeocodeResultDto, type SavedPlaceDto, type UpdatePlaceRequest,
  type UpdateSavedPlaceRequest,
} from '@lupira/maps-api/models';
import type { GeoPoint } from '@danbro96/lupira-domain-places/geo';
import { findSavedPlace, linkPlan } from '@lupira/maps-domain/savedPlaces';

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

/** The building-precise address at a spot. Not a persisted root: geocoding always goes to the network. */
export function useReverseGeocode(point: GeoPoint | null) {
  return useQuery({
    ...onlineQuery(['geocode', 'reverse', 'building', point?.lat, point?.lon], async (): Promise<GeocodeResultDto | null> => {
      try {
        return await reverseGeocode({ lat: point!.lat, lon: point!.lon, precision: ReversePrecision.Building });
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

/** Resolves a pin to a catalog place (matched within the dedupe radius, else created and auto-named when `name` is
 *  blank), then saves it unless a saved place already labels it. */
export function useSavePinnedPlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: async ({ point, name, isFavorite }: { point: GeoPoint; name: string; isFavorite: boolean }):
      Promise<{ saved: SavedPlaceDto; existed: boolean }> => {
      const place = await createPlaceFromPin({ name: name || null, latitude: point.lat, longitude: point.lon });
      if (!place.placeId) throw new Error('No place resolved at the pin.');
      const existing = findSavedPlace(await listSavedPlaces(), { placeId: place.placeId });
      if (existing) return { saved: existing, existed: true };
      const saved = await createSavedPlace({ label: name || place.name, placeId: place.placeId, isFavorite });
      return { saved, existed: false };
    },
    onSuccess: invalidate,
  });
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
    onSuccess: invalidate,
  });
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
