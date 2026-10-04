import { useQuery } from '@tanstack/react-query';
import { getCurrentLocation, getThinnedTrack, listVisits } from '@lupira/maps-api/fetch/location';
import { LIVE_FIX_POLL_MS, LIVE_FIX_STALE_MS, movementStaleMs } from '@danbro96/lupira-domain-places/geo';
import { trackBucketSeconds } from '@lupira/maps-domain/mapWindow';

/** GPS reads for the map. Empty until something uploads — this app's own recorder is the only producer. */

export function useVisits(fromIso: string, toIso: string, enabled: boolean) {
  return useQuery({
    queryKey: ['movement', 'visits', fromIso, toIso],
    enabled,
    staleTime: movementStaleMs(toIso),
    queryFn: async () => {
      const r = await listVisits({ from: fromIso, to: toIso });
      if (r.status !== 200) throw new Error(`visits ${r.status}`);
      return r.data;
    },
  });
}

export function useThinnedTrack(fromIso: string, toIso: string, enabled: boolean) {
  return useQuery({
    queryKey: ['movement', 'track', fromIso, toIso],
    enabled,
    staleTime: movementStaleMs(toIso),
    queryFn: async () => {
      // Raw /location/track caps at 50k points; the thinned form is one best fix per bucket.
      const bucketSeconds = trackBucketSeconds(new Date(fromIso), new Date(toIso));
      const r = await getThinnedTrack({ from: fromIso, to: toIso, bucketSeconds });
      if (r.status !== 200) throw new Error(`track ${r.status}`);
      return r.data;
    },
  });
}

export function useCurrentFixes(enabled: boolean, live: boolean) {
  return useQuery({
    queryKey: ['movement', 'current'],
    enabled,
    staleTime: LIVE_FIX_STALE_MS,
    refetchInterval: live ? LIVE_FIX_POLL_MS : false,
    queryFn: async () => {
      const r = await getCurrentLocation();
      if (r.status !== 200) throw new Error(`current ${r.status}`);
      return r.data;
    },
  });
}
