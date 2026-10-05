import { useQuery } from '@tanstack/react-query';
import { onlineQuery } from '@danbro96/lupira-expo-query/onlineQuery';
import { getMe } from '@lupira/maps-api/fetch/contact';

/** Your own contact id, as contact-api links it; null until it loads or when none is linked. */
export function useMyContactId(): string | null {
  const { data } = useQuery(onlineQuery(['me'], () => getMe()));
  return data?.contactId ?? null;
}
