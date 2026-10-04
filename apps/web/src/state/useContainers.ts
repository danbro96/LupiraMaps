import { useListContainers } from '@lupira/maps-api/query/cal';

/** Your readable calendars — what event pins are grouped and coloured by. */
export function useContainers() {
  const query = useListContainers();
  return { ...query, calendars: query.data ?? [] };
}
