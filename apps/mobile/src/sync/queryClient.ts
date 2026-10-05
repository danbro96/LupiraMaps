import { createAppQueryClient } from '@danbro96/lupira-expo-query/queryClient';
import { APP_VERSION } from '../config';

/** Persists what the map draws. Search, geocoding and the event and device calls always go to the network. */
export const { queryClient, persistOptions } = createAppQueryClient({
  persistRoots: ['map', 'places', 'occurrences', 'calendars', 'contacts', 'me', 'movement'],
  buster: APP_VERSION,
});
