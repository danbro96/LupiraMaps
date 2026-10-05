import { useQuery } from '@tanstack/react-query';
import { useOnline } from '@danbro96/lupira-expo-query/online';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import type { MapTheme } from '@danbro96/lupira-tokens-map/map';
import { loadMapStyle, type BasemapStyle } from '../data/mapStyle';

/** Offline with nothing cached, the map draws its pins on the fallback background rather than waiting. */
export function useMapStyle(theme: MapTheme): { style: BasemapStyle | undefined; degraded: boolean } {
  const online = useOnline();
  const q = useQuery({ ...onlineQuery(['map', 'style', theme], () => loadMapStyle(theme)), staleTime: 60 * 60_000 });
  return { style: q.data, degraded: q.isError || (!q.data && !online) };
}
