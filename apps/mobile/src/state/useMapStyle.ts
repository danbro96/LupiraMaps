import { useQuery } from '@tanstack/react-query';
import type { MapTheme } from '@danbro96/lupira-tokens-map/map';
import { loadMapStyle, type BasemapStyle } from '../data/mapStyle';
import { useReachability } from '../sync/reachability';

/** Offline with nothing cached, the map draws its pins on the fallback background rather than waiting. */
export function useMapStyle(theme: MapTheme): { style: BasemapStyle | undefined; degraded: boolean } {
  const reachable = useReachability((s) => s.serverReachable);
  const q = useQuery<BasemapStyle>({
    queryKey: ['map', 'style', theme],
    staleTime: 60 * 60_000,
    queryFn: () => loadMapStyle(theme),
  });
  return { style: q.data, degraded: q.isError || (!q.data && !reachable) };
}
