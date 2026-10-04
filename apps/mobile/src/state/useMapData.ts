import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FeatureCollection } from 'geojson';
import { getHotspots } from '@lupira/maps-api/fetch/cal';
import { listSavedPlaces } from '@lupira/maps-api/fetch/geo';
import { getPhotoMap } from '@lupira/maps-api/fetch/photo';
import type { MapViewport } from '@danbro96/lupira-domain-places/geo';
import { dayEndIso, dayStartIso } from '@danbro96/lupira-domain-core/time';
import {
  EMPTY_FEATURES,
  contactFeatures,
  currentFixFeatures,
  eventFeatures,
  hotspotFeatures,
  photoFeatures,
  savedPlaceFeatures,
  trackFeatures,
  visitFeatures,
  TRACK_MAX_GAP_S,
} from '@lupira/maps-domain/mapFeatures';
import { useCalendars } from './useContainers';
import { useCurrentFixes, useThinnedTrack, useVisits } from './useMovement';
import { useMyContactId } from './useMe';
import { useOccurrencesBetween } from './useOccurrences';
import { usePlaceCoords } from './usePlaceLookup';
import { useParentsHomes, useResidencyRows } from './useResidencies';

/** GeoJSON layers for the map. Every key sits under a root the read cache persists (`sync/queryClient`), so
 *  a cold start offline still draws what was last seen. */

export type EventFeatures = { features: FeatureCollection; unmappableCount: number };

const NO_EVENTS: EventFeatures = { features: EMPTY_FEATURES, unmappableCount: 0 };

/** Event pins over the local days [fromDay, toDay]: one per item and place, at its earliest occurrence in range. */
export function useEventFeatures(fromDay: string, toDay: string, enabled: boolean): EventFeatures {
  const occurrencesQ = useOccurrencesBetween(dayStartIso(fromDay), dayEndIso(toDay), enabled);
  const occurrences = useMemo(
    () => [...(occurrencesQ.data ?? [])].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    [occurrencesQ.data],
  );
  const calendarsQ = useCalendars();
  const places = usePlaceCoords(useMemo(() => occurrences.map((o) => o.placeId), [occurrences]));

  return useMemo(() => {
    if (!enabled) return NO_EVENTS;
    const colorByCalendar = new Map((calendarsQ.data ?? []).map((c) => [c.id, c.color ?? null]));
    return eventFeatures(
      occurrences.map((o) => {
        const calendarId = o.calendarIds.find((id) => colorByCalendar.has(id)) ?? o.calendarIds[0] ?? null;
        return {
          itemId: o.id,
          title: o.title,
          start: o.start,
          calendarId,
          color: (calendarId ? colorByCalendar.get(calendarId) : null) ?? null,
          placeId: o.placeId,
          hasLocationLabel: Boolean(o.locationLabel),
        };
      }),
      places,
    );
  }, [enabled, occurrences, places, calendarsQ.data]);
}

/** Geotagged photos in the viewport, clustered by the server for its zoom, so panning refetches rather
 *  than holding the whole library; thumbnails are presigned URLs valid for hours. */
export function usePhotoFeatures(viewport: MapViewport | null, fromIso: string | null, enabled: boolean): FeatureCollection {
  const q = useQuery({
    queryKey: ['map', 'photos', viewport?.bbox, viewport?.zoom, fromIso],
    enabled: enabled && viewport !== null,
    queryFn: async () => {
      const r = await getPhotoMap({ ...viewport!, ...(fromIso ? { from: fromIso } : {}) });
      if (r.status !== 200) throw new Error(`photos map ${r.status}`);
      return r.data;
    },
  });

  return enabled ? photoFeatures(q.data?.features ?? []) : EMPTY_FEATURES;
}

export type MovementFeatures = { visits: FeatureCollection; track: FeatureCollection; current: FeatureCollection };

const EMPTY_MOVEMENT: MovementFeatures = { visits: EMPTY_FEATURES, track: EMPTY_FEATURES, current: EMPTY_FEATURES };
/** Where you've been: dwell circles, an activity-coloured track, and the last fix each device reported.
 *  `live` polls the current fixes — only while the map is on screen. */
export function useMovementFeatures(fromIso: string, toIso: string, enabled: boolean, live: boolean): MovementFeatures {
  const visitsQ = useVisits(fromIso, toIso, enabled);
  const trackQ = useThinnedTrack(fromIso, toIso, enabled);
  const currentQ = useCurrentFixes(enabled, live);

  if (!enabled) return EMPTY_MOVEMENT;
  return {
    visits: visitFeatures(visitsQ.data ?? []),
    track: trackFeatures(
      (trackQ.data ?? []).map((p) => ({ lat: p.lat, lon: p.lon, ts: p.ts, activity: p.activity ?? null })),
      TRACK_MAX_GAP_S,
    ),
    current: currentFixFeatures(currentQ.data ?? []),
  };
}

/** Contact pins — co-located contacts (a household) merge into one pin, and your parents' home is named as such.
 *  Current residencies only; residency history is a web-only nicety not worth the phone screen. */
export function useContactFeatures(enabled: boolean): FeatureCollection {
  const rows = useResidencyRows(enabled);
  const parents = useParentsHomes(useMyContactId(), rows);
  const places = usePlaceCoords(rows.map((r) => r.placeId));

  if (!enabled) return EMPTY_FEATURES;
  return contactFeatures(rows, places, new Map(parents.map((p) => [p.placeId, p.label]))).features;
}

/** Saved-place pins (favorites first is the API's order; gazetteer link or raw pin). */
export function useSavedPlaceFeatures(enabled: boolean): FeatureCollection {
  const q = useQuery({
    queryKey: ['map', 'saved-places'],
    enabled,
    queryFn: async () => {
      const r = await listSavedPlaces();
      if (r.status !== 200) throw new Error(`saved places ${r.status}`);
      return r.data;
    },
  });

  return enabled ? savedPlaceFeatures(q.data ?? []) : EMPTY_FEATURES;
}

/** Hotspots from `fromIso` (all-time when null) up to now, ranked by active days. */
export function useHotspotFeatures(fromIso: string | null, enabled: boolean): FeatureCollection {
  const q = useQuery({
    queryKey: ['map', 'hotspots', fromIso],
    enabled,
    staleTime: 600_000,
    queryFn: async () => {
      const r = await getHotspots(fromIso ? { from: fromIso } : undefined);
      if (r.status !== 200) throw new Error(`hotspots ${r.status}`);
      return r.data;
    },
  });

  return enabled ? hotspotFeatures(q.data ?? []) : EMPTY_FEATURES;
}
