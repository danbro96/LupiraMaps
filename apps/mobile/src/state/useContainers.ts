import { useQuery } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { listContainers } from '@lupira/maps-api/fetch/cal';

/** Your readable calendars — what event pins are coloured by. */
export function useCalendars() {
  return useQuery(onlineQuery(['calendars'], () => listContainers()));
}
