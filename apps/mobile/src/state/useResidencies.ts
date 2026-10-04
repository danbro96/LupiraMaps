import { useQuery } from '@tanstack/react-query';
import { residencyStatus } from '@danbro96/lupira-domain-contacts/fuzzyDate';
import { parentsHomes, type ContactAddressRow, type ParentsHome } from '@danbro96/lupira-domain-contacts/residents';
import { getPlaceEntry, listContactRelations, listResidencies, searchContacts } from '@lupira/maps-api/fetch/contact';
import type { PlaceEntryDto } from '@lupira/maps-api/models';

/** Every readable contact's residencies as `@danbro96/lupira-domain-contacts/residents` rows (named). One pair of
 *  queries serves the map, quick places and the preview sheet, so they agree and share one place lookup. */
export function useResidencyRows(enabled = true): ContactAddressRow[] {
  const residencies = useQuery({
    queryKey: ['contacts', 'residencies'],
    enabled,
    queryFn: async () => {
      const r = await listResidencies();
      if (r.status !== 200) throw new Error(`residencies ${r.status}`);
      return r.data;
    },
  });
  const contacts = useQuery({
    queryKey: ['contacts', 'list'],
    enabled,
    queryFn: async () => {
      const r = await searchContacts({});
      if (r.status !== 200) throw new Error(`contacts ${r.status}`);
      return r.data;
    },
  });
  const names = new Map((contacts.data ?? []).map((c) => [c.id, c.displayName]));
  return (residencies.data ?? []).flatMap((r) => {
    const displayName = names.get(r.contactId);
    return displayName === undefined ? [] : [{
      contactId: r.contactId, displayName, placeId: r.placeId, addressType: r.type, label: r.label ?? null,
      movedIn: r.movedIn ?? null, movedOut: r.movedOut ?? null,
    }];
  });
}

/** Where the contact's parents live now — derived from Parent relationships and their residencies, never stored. */
export function useParentsHomes(contactId: string | null, rows: readonly ContactAddressRow[]): ParentsHome[] {
  const { data: relations } = useQuery({
    queryKey: ['contacts', contactId, 'relations'],
    enabled: !!contactId,
    queryFn: async () => {
      const r = await listContactRelations(contactId!);
      if (r.status !== 200) throw new Error(`relations ${r.status}`);
      return r.data;
    },
  });
  if (!contactId) return [];
  const parents = (relations ?? []).filter((r) => r.kind === 'Parent' && !r.ended && r.provenance !== 'Inferred')
    .map((r) => ({ contactId: r.contactId, displayName: r.displayName }));
  return parentsHomes(contactId, parents, rows);
}

/** A place's door codes, shown only while someone you can see lives there now. The server answers 404 when nobody
 *  does, which is an empty answer here, not an error. */
export function usePlaceEntry(placeId: string | null | undefined, rows: readonly ContactAddressRow[]): PlaceEntryDto | null {
  const lived = rows.some((r) => r.placeId === placeId && residencyStatus(r.movedIn, r.movedOut) === 'active');
  const q = useQuery({
    queryKey: ['contacts', 'place-entry', placeId],
    enabled: !!placeId && lived,
    retry: false,
    queryFn: async () => {
      const r = await getPlaceEntry(placeId!).catch(() => null);
      return r?.status === 200 ? r.data : null;
    },
  });
  return lived && q.data && q.data.codes.length > 0 ? q.data : null;
}
