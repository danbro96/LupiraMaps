import { useMemo } from 'react';
import { nextPlacedEvents, quickPlaces, type QuickPlace } from '@lupira/maps-domain/quickPlaces';
import { addDays } from '@danbro96/lupira-domain-core/time';
import { useCalendars } from './useContainers';
import { useMyContactId } from './useMe';
import { useOccurrencesBetween } from './useOccurrences';
import { usePlaceCoords } from './usePlaceLookup';
import { useParentsHomes, useResidencyRows } from './useResidencies';

const LOOKAHEAD_DAYS = 60;

/** The map's jump strip (`@lupira/maps-domain/quickPlaces`): your residencies, your parents' home and the next
 *  placed events. The labels come from the read cache offline; the points need the geo lookup. */
export function useQuickPlaces(nowIso: string): QuickPlace[] {
  const me = useMyContactId();
  const rows = useResidencyRows();
  const parents = useParentsHomes(me, rows);
  const { data: calendars } = useCalendars();
  const { data: occurrences } = useOccurrencesBetween(nowIso, addDays(new Date(nowIso), LOOKAHEAD_DAYS).toISOString());

  const ownAddresses = useMemo(() => rows.filter((r) => r.contactId === me).map((r) => ({ ...r, type: r.addressType })), [rows, me]);
  const upcoming = useMemo(() => nextPlacedEvents(occurrences ?? [], new Date(nowIso)), [occurrences, nowIso]);
  const placeIds = useMemo(
    () => [...ownAddresses.map((a) => a.placeId), ...parents.map((p) => p.placeId), ...upcoming.map((o) => o.placeId)],
    [ownAddresses, parents, upcoming],
  );
  const places = usePlaceCoords(placeIds);

  return useMemo(() => quickPlaces({
    ownAddresses,
    parents,
    places,
    upcoming: upcoming.map((o) => ({
      itemId: o.id,
      title: o.title ?? null,
      start: o.start,
      placeId: o.placeId!,
      color: calendars?.find((cal) => o.calendarIds.includes(cal.id))?.color ?? null,
    })),
  }), [ownAddresses, parents, places, upcoming, calendars]);
}
