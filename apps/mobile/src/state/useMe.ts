import { useQuery } from '@tanstack/react-query';
import { getMe } from '@lupira/maps-api/fetch/contact';

/** Your own contact id, as contact-api links it; null until it loads or when none is linked. */
export function useMyContactId(): string | null {
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await getMe();
      if (r.status !== 200) throw new Error(`me ${r.status}`);
      return r.data;
    },
  });
  return data?.contactId ?? null;
}
