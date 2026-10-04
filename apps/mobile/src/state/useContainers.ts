import { useQuery } from '@tanstack/react-query';
import { listContainers } from '@lupira/maps-api/fetch/cal';

/** Your readable calendars — what event pins are coloured by. */
export function useCalendars() {
  return useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const r = await listContainers();
      if (r.status !== 200) throw new Error(`calendars ${r.status}`);
      return r.data;
    },
  });
}
