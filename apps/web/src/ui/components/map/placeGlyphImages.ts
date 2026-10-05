import type { Map as MapLibreMap } from 'maplibre-gl';
import { createElement, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SvgIconComponent } from '@mui/icons-material';
import { PLACE_GLYPHS, type PlaceGlyph } from '@danbro96/lupira-domain-maps/placeGlyph';
import { MAP_COLORS, type MapTheme } from '@danbro96/lupira-tokens-map/map';
import * as Icons from '@danbro96/lupira-web-mui/icons';

const GLYPH_ICONS: Record<PlaceGlyph, SvgIconComponent> = {
  home: Icons.HomeIcon,
  office: Icons.BusinessIcon,
  restaurant: Icons.RestaurantIcon,
  cafe: Icons.CafeIcon,
  bar: Icons.BarIcon,
  store: Icons.StoreIcon,
  grocery: Icons.GroceryIcon,
  school: Icons.SchoolIcon,
  clinic: Icons.MedicalIcon,
  hospital: Icons.HospitalIcon,
  pharmacy: Icons.PharmacyIcon,
  gym: Icons.GymIcon,
  park: Icons.ParkIcon,
  airport: Icons.AirportIcon,
  station: Icons.StationIcon,
  busStop: Icons.BusStopIcon,
  hotel: Icons.HotelIcon,
  landmark: Icons.LandmarkIcon,
  government: Icons.GovernmentIcon,
  worship: Icons.ChurchIcon,
};

const PREFIX = 'place-glyph';
const SIZE_PX = 28;

export const placeGlyphImagePrefix = (theme: MapTheme) => `${PREFIX}:${theme}:`;

function glyphSvg(glyph: PlaceGlyph, color: string): string {
  const paths = renderToStaticMarkup(createElement(GLYPH_ICONS[glyph])).match(/<path[^>]*>/g) ?? [];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE_PX}" height="${SIZE_PX}" fill="${color}">${paths.join('')}</svg>`;
}

function addGlyphImage(map: MapLibreMap, theme: MapTheme, glyph: PlaceGlyph) {
  const id = placeGlyphImagePrefix(theme) + glyph;
  const image = new Image(SIZE_PX, SIZE_PX);
  image.onload = () => {
    if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio: 2 });
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(glyphSvg(glyph, MAP_COLORS[theme].ink))}`;
}

/** Registers a glyph image the first time a layer asks for it; setStyle drops images, so this re-answers every request. */
export function usePlaceGlyphImages(map: MapLibreMap) {
  useEffect(() => {
    const onMissing = (e: { id: string }) => {
      const [prefix, theme, glyph] = e.id.split(':');
      if (prefix === PREFIX && (PLACE_GLYPHS as readonly string[]).includes(glyph)) addGlyphImage(map, theme as MapTheme, glyph as PlaceGlyph);
    };
    map.on('styleimagemissing', onMissing);
    return () => {
      map.off('styleimagemissing', onMissing);
    };
  }, [map]);
}
