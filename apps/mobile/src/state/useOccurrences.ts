import { useQuery } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { searchItems } from '@lupira/maps-api/fetch/cal';

/** Occurrences overlapping [fromIso, toIso) across every calendar you can read. */
export function useOccurrencesBetween(fromIso: string, toIso: string, enabled = true) {
  return useQuery({
    ...onlineQuery(['occurrences', fromIso, toIso], () => searchItems({ from: fromIso, to: toIso })),
    enabled,
  });
}
