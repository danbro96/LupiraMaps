import { useQueryClient } from '@tanstack/react-query';

/**
 * Invalidation helpers over the orval-generated query keys, which are the BFF's own paths — every
 * one carries its route prefix, so a prefix match can't sweep the wrong API's queries.
 *
 * Match on the prefixed path. A bare `/places` matches nothing.
 */
export function useInvalidateContacts() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = String(q.queryKey[0] ?? '');
        return key.startsWith('/contact-api/contacts')
          || key.startsWith('/contact-api/residencies')
          || key.startsWith('/contact-api/places');
      },
    });
}

/** Geo place mutations: the place queries themselves plus the `/curation` lists and hotspots that mirror place state. */
export function useInvalidatePlaces() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = String(q.queryKey[0] ?? '');
        return key.startsWith('/geo-api/places') || key.startsWith('/geo-api/me/places') || key.startsWith('/geo-api/curation')
          || key.startsWith('/api/hotspots');
      },
    });
}
