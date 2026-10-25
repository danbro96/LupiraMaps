import type { FeatureCollection, Point } from 'geojson';
import { useEffect, useRef } from 'react';
import { bboxOf, mapViewport, padBbox, type GeoPoint, type MapViewport } from '@danbro96/lupira-domain-places/geo';
import { TARGET_ZOOM, placeSpanM, zoomForSpan } from '@danbro96/lupira-domain-maps/mapZoom';
import { useGeoPlace, useSavedPlace } from '../../../state/usePlaces';
import { useMap } from './MapCanvas';

/** MUI's `sm` breakpoint. */
const PHONE_MAX_WIDTH_PX = 600;

/** Fly to the selected place whenever ?place= or ?saved= changes, framed by the kind of place (a raw saved spot
 *  at pin zoom), and say where it is so the screen can pin it. */
export function FlyToPlace({ placeId, savedPlaceId, onLocated }: {
  placeId: string | undefined;
  savedPlaceId: string | undefined;
  onLocated: (point: [number, number]) => void;
}) {
  const map = useMap();
  const { saved } = useSavedPlace({ savedPlaceId });
  const linkedId = placeId ?? saved?.placeId ?? undefined;
  const { data: place } = useGeoPlace(linkedId);
  const flownTo = useRef<string>(undefined);
  const key = placeId ?? savedPlaceId;

  useEffect(() => {
    if (!key) { flownTo.current = undefined; return; }
    if (flownTo.current === key) return;
    const target = place && place.latitude != null && place.longitude != null
      ? { lon: place.longitude, lat: place.latitude, spanM: placeSpanM(place) }
      : !linkedId && saved?.latitude != null && saved.longitude != null
        ? { lon: saved.longitude, lat: saved.latitude, spanM: null }
        : null;
    if (!target) return;
    flownTo.current = key;
    const { clientWidth, clientHeight } = map.getContainer();
    const zoom = target.spanM != null ? zoomForSpan(target.spanM, clientWidth, target.lat) : TARGET_ZOOM;
    // Below sm the place panel is a bottom sheet up to 60% tall: centre the place in the map left above it.
    const offset: [number, number] = clientWidth < PHONE_MAX_WIDTH_PX ? [0, -clientHeight * 0.3] : [0, 0];
    map.flyTo({ center: [target.lon, target.lat], zoom, offset });
    onLocated([target.lon, target.lat]);
  }, [map, key, linkedId, place, saved, onLocated]);
  return null;
}

/** Reports the viewport (bbox + zoom) on every settled move. */
export function ViewportReporter({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMap();
  useEffect(() => {
    const report = () => {
      const b = map.getBounds();
      onChange(mapViewport([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], map.getZoom()));
    };
    report();
    map.on('moveend', report);
    return () => {
      map.off('moveend', report);
    };
  }, [map, onChange]);
  return null;
}

/** One-time fit to the first non-empty data, unless a deep link already aimed the camera. */
export function FitToData({ collections, skip }: { collections: FeatureCollection[]; skip: boolean }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || skip) return;
    const points: GeoPoint[] = collections.flatMap((fc) =>
      fc.features
        .filter((f): f is GeoJSON.Feature<Point> => f.geometry.type === 'Point')
        .map((f) => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })));
    if (points.length === 0) return;
    done.current = true;
    const [minLon, minLat, maxLon, maxLat] = padBbox(bboxOf(points)!, 0.15);
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { maxZoom: 14, duration: 600 });
  }, [map, collections, skip]);
  return null;
}
