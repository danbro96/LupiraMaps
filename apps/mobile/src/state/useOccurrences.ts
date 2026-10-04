import { useQuery } from '@tanstack/react-query';
import { searchItems } from '@lupira/maps-api/fetch/cal';

/** Occurrences overlapping [fromIso, toIso) across every calendar you can read. */
export function useOccurrencesBetween(fromIso: string, toIso: string, enabled = true) {
  return useQuery({
    queryKey: ['occurrences', fromIso, toIso],
    enabled,
    queryFn: async () => {
      const r = await searchItems({ from: fromIso, to: toIso });
      if (r.status !== 200) throw new Error(`occurrences ${r.status}`);
      return r.data;
    },
  });
}
