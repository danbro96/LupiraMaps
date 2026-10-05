import { useQuery } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { getCurrentLocation, getThinnedTrack, listVisits } from '@lupira/maps-api/fetch/location';
import { LIVE_FIX_POLL_MS, LIVE_FIX_STALE_MS, movementStaleMs } from '@danbro96/lupira-domain-places/geo';
import { trackBucketSeconds } from '@lupira/maps-domain/mapWindow';

/** GPS reads for the map. Empty until something uploads — this app's own recorder is the only producer. */

export function useVisits(fromIso: string, toIso: string, enabled: boolean) {
  return useQuery({
    ...onlineQuery(['movement', 'visits', fromIso, toIso], () => listVisits({ from: fromIso, to: toIso })),
    enabled,
    staleTime: movementStaleMs(toIso),
  });
}

export function useThinnedTrack(fromIso: string, toIso: string, enabled: boolean) {
  return useQuery({
    // Raw /location/track caps at 50k points; the thinned form is one best fix per bucket.
    ...onlineQuery(['movement', 'track', fromIso, toIso], () =>
      getThinnedTrack({ from: fromIso, to: toIso, bucketSeconds: trackBucketSeconds(new Date(fromIso), new Date(toIso)) })),
    enabled,
    staleTime: movementStaleMs(toIso),
  });
}

export function useCurrentFixes(enabled: boolean, live: boolean) {
  return useQuery({
    ...onlineQuery(['movement', 'current'], () => getCurrentLocation()),
    enabled,
    staleTime: LIVE_FIX_STALE_MS,
    refetchInterval: live ? LIVE_FIX_POLL_MS : false,
  });
}
