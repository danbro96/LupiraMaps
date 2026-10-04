import { useGetMe } from '@lupira/maps-api/query/contact';

/** Your own contact id, as contact-api links it; null until it loads or when none is linked. */
export function useMyContactId(): string | null {
  const { data } = useGetMe();
  return data?.contactId ?? null;
}
