import { QueryCache, QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import Storage from 'expo-sqlite/kv-store';
import { ApiError, isNetworkError } from '@danbro96/lupira-http/apiError';
import { APP_VERSION } from '../config';
import { probeServer } from './reachability';

const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

/** Query-key roots the read cache keeps across restarts: what the map draws. Search, geocoding and the
 *  event and device calls always go to the network. */
const PERSISTED_ROOTS = new Set(['map', 'places', 'occurrences', 'calendars', 'contacts', 'me', 'movement']);

export const queryClient = new QueryClient({
  // A transport failure may mean the server went away; the probe decides, so one timeout can't flip it.
  queryCache: new QueryCache({ onError: (e) => { if (isNetworkError(e)) void probeServer(); } }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Must outlive maxAge, or the persister writes back a cache that has already been collected.
      gcTime: MAX_AGE_MS,
      retry: (failures, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && failures < 1,
    },
  },
});

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: createAsyncStoragePersister({ storage: Storage, key: 'lupira-maps.query-cache' }),
  maxAge: MAX_AGE_MS,
  buster: APP_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) && PERSISTED_ROOTS.has(String(q.queryKey[0])),
  },
};
