import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { lookupPlaces } from '@lupira/maps-api/fetch/geo';
import type { PlaceDto } from '@lupira/maps-api/models';
import { PLACE_LOOKUP_MAX, chunk, distinctPlaceIds, toLocatedPlaces } from '@danbro96/lupira-domain-places/places';

// Shared so the empty case keeps its identity — a fresh Map per render defeats callers' memoization.
const NO_PLACES = new Map<string, PlaceDto>();

/** Hydrate stored geo place ids into coordinates in one batched query. The id set is the key, not a
 *  URL path — lookup is a POST, which orval generates as a mutation. The cache holds the list, not the
 *  Map: the persister writes JSON, and a Map serializes to `{}`. */
export function usePlaceCoords(placeIds: (string | null | undefined)[]): Map<string, PlaceDto> {
  const distinct = distinctPlaceIds(placeIds);
  const q = useQuery({
    ...onlineQuery(['places', 'coords', distinct], async () =>
      (await Promise.all(chunk(distinct, PLACE_LOOKUP_MAX).map((ids) => lookupPlaces({ ids })))).flat()),
    enabled: distinct.length > 0,
    staleTime: 10 * 60_000,
  });
  return useMemo(() => (q.data ? toLocatedPlaces<PlaceDto>(q.data) : NO_PLACES), [q.data]);
}
