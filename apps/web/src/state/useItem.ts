import { useGetItem } from '@lupira/maps-api/query/cal';

export function useItem(itemId: string) {
  return useGetItem(itemId);
}
