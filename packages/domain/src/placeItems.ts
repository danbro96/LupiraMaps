// How a calendar item relates to a place it references. Field names mirror cal's CalendarItemDto.

import { displayTitle } from '@danbro96/lupira-domain-events/itemLabels';
import { fmtDate, fmtDateTime, parseYmd } from '@danbro96/lupira-domain-core/time';

export interface PlaceItemLike {
  title?: string | null;
  placeId?: string | null;
  isAllDay: boolean;
  startsAt?: string | null;
  startDate?: string | null;
  details?: { travel?: { fromPlaceId?: string | null; toPlaceId?: string | null } | null } | null;
}

/** The role the place plays for the item: its location, or a travel endpoint. */
export function placeRole(item: PlaceItemLike, placeId: string): 'At' | 'To' | 'From' | '' {
  if (item.placeId === placeId) return 'At';
  const travel = item.details?.travel;
  if (travel?.toPlaceId === placeId) return 'To';
  if (travel?.fromPlaceId === placeId) return 'From';
  return '';
}

export function placeItemWhen(item: PlaceItemLike): string {
  if (item.isAllDay) return item.startDate ? fmtDate(parseYmd(item.startDate)) : '';
  return item.startsAt ? fmtDateTime(new Date(item.startsAt)) : '';
}

/** A list row for an item at a place: its title, then role and when. */
export function describePlaceItem(item: PlaceItemLike, placeId: string): { title: string; detail: string } {
  return { title: displayTitle(item.title), detail: [placeRole(item, placeId), placeItemWhen(item)].filter(Boolean).join(' · ') };
}
