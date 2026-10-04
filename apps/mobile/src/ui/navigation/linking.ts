import type { LinkingOptions } from '@react-navigation/native';
import type { MapTarget, RootStackParamList } from './types';

function parseAt(raw: string): MapTarget | undefined {
  const [lon, lat] = raw.split(',').map(Number);
  return Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : undefined;
}

// 'none' is a choice, not an absence.
const parseLayers = (raw: string): string[] => (raw === 'none' ? [] : raw.split(','));
const parse = { at: parseAt, layers: parseLayers };

/** `lupiramaps://at/{lon},{lat}`, `lupiramaps://?at={lon},{lat}&layers=…` and `lupiramaps://places` all open
 *  the map. The OIDC redirect (lupiramaps://oauthredirect) matches nothing here and is ignored by navigation. */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['lupiramaps://'],
  config: {
    screens: {
      Map: {
        path: 'at/:at',
        parse,
        alias: [{ path: '', parse }, { path: 'places', parse }],
      },
    },
  },
};
