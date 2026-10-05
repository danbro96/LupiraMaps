# Map (web + mobile)

## Web

Route `/` (the map) and `/places` (gazetteer curation). Both are lazy (`React.lazy`) so maplibre-gl stays in its own chunk.

- **URL state**: `?at=lon,lat` pins at zoom 16; `?from=&to=` (inclusive local days) is the range; `?layers=` the layer list (`none` is a choice, not an absence); `?place=` opens the place panel; `?item=` the event card. Layers and the range preset are remembered in `state/localPrefs` for when the URL names none. A deep link (`at`/`place`/`item`) stops `FitToData` pulling the camera away.
- **Data**: occurrences (`GET /api/items` from/to) + residencies hydrate placeIds via geo `POST /places/lookup` (`usePlaceCoords`, key `/geo-api/places/lookup` — a hand-written query over a POST, which orval generates as a mutation). GPS via the `/location-api` prefix (`@lupira/maps-api/query/location`).
- **Basemap**: geo-api `/basemap/style.json?theme=` + pmtiles. `@danbro96/lupira-web-maplibre/mapStyle` rewrites URLs absolute; a fallback wash shows when unprovisioned.
- **Layer palette** is `@danbro96/lupira-tokens-map/map`, dataviz-validated — don't tweak hues casually. Unknown activity = dashed gray, never a fifth hue. The layer list is `@lupira/maps-tokens/mapLayers`, sizes `mapPaint`.
- **Glue**: MapLibre/React glue is centralized in `useGeoJsonLayer` (re-adds sources/layers on `styledata`; layers only declare which ids are `interactive`, for the cursor).
- **Clicks are the screen's, not the layers'**: `MapClicks` queries every interactive layer under the pointer at once → `@lupira/maps-domain/mapHits` → `MapHitsCard` in `MapPopover` (one hit = card, several = list; text and actions from `mapHitLabels`), with a `SelectionMarker` on what was picked.
- **Cross-app**: an event hit opens the read-only `EventCard` (`?item=`), whose "Open in calendar" and every other hand-off (contact → cal, photo / day → photos) are `webLinks` from `@danbro96/lupira-domain-links` over `config/siblings.ts` (`VITE_{CAL,MAPS,PHOTOS}_URL`; dev defaults to the Vite ports 5174/5175/5176, a build to `https://*.lupira.com`).
- **Range bar** (Today … Year/All, default 30 days) bounds every dated layer — events, photos, hotspots, movement (`trackBucketSeconds`).
- A jump strip (`useQuickPlaces` → `@lupira/maps-domain/quickPlaces`) lists your home, work and next placed events.
- **Photo layer is clustered by photo-api, not MapLibre**: `/photos/map` takes the viewport's `zoom` and answers per-cell counts (a feature with `count > 1`, tap = fit `photoCellBounds`) or single photos. Never add client clustering: it would re-cluster the cells, and any client-side cap brings back the bug where newer photos crowd older places off the map.

### maplibre-gl v6 worker

maplibre-gl v6's default worker URL (sibling of the entry module) 404s under bundlers, and bundling the worker yourself (`?worker&url`) emits an EMPTY file in prod (tree-shaken — maplibre's `sideEffects` allowlist). Symptom: FF "Attempting to create a Worker from an empty source", gray map, zero `sourcedata`.

Fix, both halves required:

- The `sync:maplibre` script (`lupira-sync-maplibre public/maplibre`, from `@danbro96/lupira-web-maplibre`) vendors `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` verbatim into `public/maplibre/` (gitignored, runs predev/prebuild).
- `setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')` in `@danbro96/lupira-web-maplibre/maplibreSetup`, a side-effect module every map constructor imports (`MapCanvas`).

A missing basemap *sprite* is equally fatal (style stuck loading); `loadMapStyle` Range-probes the pmtiles and falls back to `fallbackStyle` when assets are unprovisioned.

## Mobile

`apps/mobile/src/ui/screens/MapScreen.tsx`, the root screen, on `@maplibre/maplibre-react-native`. MapLibre Native reads `pmtiles://https://` sources directly (no worker/protocol shims).

- **Style handling** (absolutize URLs, Range-probe the tiles, fall back) is `@danbro96/lupira-domain-maps/mapStyle`; `data/mapStyle.ts` supplies only the bearer transport. The bearer for native tile/glyph/sprite requests rides `TransformRequestManager.addHeader` with a stable id (in-place token rotation) and a `match` scoped to the BFF origin — never let that header reach presigned or third-party URLs.
- Layers live in `ui/map/layers.tsx`; chrome (layers sheet + locate FAB) in `MapChrome.tsx`.
- **Taps are the map's, not the sources'**: `queryRenderedFeatures` per layer under the finger → `@lupira/maps-domain/mapHits` → `MapPreviewSheet` (one hit = card with its Open, several = list); a cluster that can't split past `clusterMaxZoom` lists its leaves. The tapped or handed-over point gets `SelectionPin`.
- **Hand-offs** go through `ui/siblingLinks.ts`: the sibling app's scheme (`appLinks`), else its https page. Inbound, `lupiramaps://at/{lon},{lat}`, `lupiramaps://?at=…&layers=…` and `lupiramaps://places` open the map (`ui/navigation/linking.ts`); `layers` naming photos shows the photo layer for that visit.
- An `at` target waits for `onDidFinishLoadingMap` — the map mounts after its style loads, so an early `easeTo` is silently dropped.
- One age limit (`prefs.mapSince`, `@lupira/maps-domain/mapWindow`) bounds events, photos, hotspots and movement; layer toggles persist in `prefs.mapLayers`.
- A jump strip under the header (`QuickPlacesStrip`, `useQuickPlaces`) lists your current Home/Work residencies and your parents' home, then the next placed events; a jump frames by place type (`@danbro96/lupira-domain-maps/mapZoom`) and an event opens its preview card.

### Reads and the offline cache

Every layer reads REST through hand-written hooks: `useQuery(onlineQuery(key, fetcher))` (`@danbro96/lupira-expo-query`) over the generated body-only *fetchers* (`@lupira/maps-api/fetch/*`, which throw `ApiError`; a 404 is `e.status === 404`): occurrences (`GET /api/items` from/to), calendars, residencies + contacts + relations, place lookup, saved places, hotspots, photo cells, movement.

- `sync/queryClient.ts` is `createAppQueryClient`: the read cache persists over `expo-sqlite/kv-store`, only the key roots the map draws (`map`, `places`, `occurrences`, `calendars`, `contacts`, `me`, `movement`), `maxAge` 7 days, `buster` = app version. `onlineQuery` = fresh 5 min, one retry for transient failures only.
- Cached values must be JSON: `usePlaceCoords` caches the lookup list and builds its `Map` in `useMemo` (a `Map` serializes to `{}`).
- `App.tsx` calls `connectOnlineManager()` (NetInfo internet reachability drives `onlineManager`, so reads pause on the cached data offline instead of failing) and `connectFocusManager()` (stale queries refetch on return to the foreground). Screens read the flag via `useOnline()`.
- Auth is `createAuthStore` (`@danbro96/lupira-expo-oidc/authStore`, keys `lupira.maps.*`). Signing out clears the cache; a sign-in as a different account (or the first one on the install) clears it and resets location tracking before the session lands (`onAccountChange`, see below).

## Location uploader (mobile)

The phone is the estate's only GPS uploader. `sync/locationRecorder.ts` records under an Android foreground service into `location_fix_queue` (SQLite `lupira-maps.db` via `@danbro96/lupira-expo-sqlite`; migration 1 is the queue, 2 the `meta` table holding the seq counter, cadence and tracking settings); `sync/locationUploader.ts` drains it, also from `sync/backgroundTask.ts`.

- Ingest is hand-written (`sync/locationIngest.ts`): it authenticates with `Authorization: DeviceKey …`, which the generated client cannot express (the OpenAPI doc declares only a Bearer scheme). It posts to the BFF's `/ingest/location*` (`device` group), which checks the key's shape and forwards it untouched.
- The device key is shown once at registration and lives in SecureStore, never in SQLite.
- An account switch (`useLocationTracking.resetForNewAccount`) stops the recorder, disables tracking, waits out any in-flight drain, then deletes the device key and empties the queue, so no fix leaves with the previous account's key. The phone is unpaired until the new account enables tracking again; the old device stays registered server-side.
- NDJSON lines are snake_case and must never carry principal/device ids — the server rejects the whole line.
- Cadence adapts to speed but **accuracy stays High in every profile**: Balanced is ~100 m, above the server's 50 m cutoff, and still-mode is exactly when visits (80 m / ≥8 min) are detected — a cheap still profile silently yields zero visits.
- Cadence changes call `startLocationUpdatesAsync` again rather than stop+start (Android 12+ forbids restarting a location FGS from the background).
- The task is registered in `index.ts`, not from a React effect — a headless restart has no App component.
