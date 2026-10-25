# Map (web + mobile)

## Web

Route `/` (the map) and `/places` (gazetteer curation). Both are lazy (`React.lazy`) so maplibre-gl stays in its own chunk.

- **URL state**: `?at=lon,lat` pins at zoom 16; `?from=&to=` (inclusive local days) is the range; `?layers=` the layer list (`none` is a choice, not an absence); `?place=` opens the place panel, `?saved=` the same panel for a saved place (how a raw-coordinate one opens); `?item=` the event card (`&occ=` names the occurrence a series pin showed). Layers and the range preset are remembered in `state/localPrefs` for when the URL names none. A deep link (`at`/`place`/`saved`/`item`) stops `FitToData` pulling the camera away.
- **Data**: occurrences (`GET /api/items` from/to) + residencies hydrate placeIds via geo `POST /places/lookup` (`usePlaceCoords`, key `/geo-api/places/lookup` — a hand-written query over a POST, which orval generates as a mutation). GPS via the `/location-api` prefix (`@lupira/maps-api/query/location`).
- **Basemap**: geo-api `/basemap/style.json?theme=` + pmtiles. `@danbro96/lupira-web-maplibre/mapStyle` rewrites URLs absolute; a fallback wash shows when unprovisioned.
- **Layer palette** is `@danbro96/lupira-tokens-map/map`, dataviz-validated — don't tweak hues casually. Unknown activity = dashed gray, never a fifth hue. The layer list is `@lupira/maps-tokens/mapLayers`, sizes `mapPaint`.
- **Glue**: MapLibre/React glue is centralized in `useGeoJsonLayer` (re-adds sources/layers on `styledata`; layers only declare which ids are `interactive`, for the cursor).
- **Clicks are the screen's, not the layers'**: `MapClicks` queries every interactive layer under the pointer at once → `@lupira/maps-domain/mapHits` → `MapHitsCard` in `MapPopover` (one hit = card, several = list; text and actions from `mapHitLabels`), with a `SelectionMarker` on what was picked.
- **Cross-app**: an event hit opens the read-only `EventCard` (`?item=&occ=`), whose "Open in calendar" lands on the occurrence the pin showed (mobile too); it and every other hand-off (contact → cal, photo / day → photos) are `webLinks` from `@danbro96/lupira-domain-links` over `config/siblings.ts` (`VITE_{CAL,MAPS,PHOTOS}_URL`; dev defaults to the Vite ports 5174/5175/5176, a build to `https://*.lupira.com`).
- **Range bar** (Today … Year/All, default 30 days) bounds every dated layer — events, photos, hotspots, movement (`trackBucketSeconds`).
- A jump strip (`useQuickPlaces` → `@lupira/maps-domain/quickPlaces`) lists your home, work and next placed events.
- **Pins become catalog places** through `POST /geo-api/places/from-pin` (`usePlaceFromPin`): an unanchored hotspot's Save as place matches a place within 25 m or creates one with address + containment, never a bare coordinate.
- **Curation** (`/places`): Fix on map picks coordinates in `MapPinDialog` from `@danbro96/lupira-web-maplibre` (lazy, own maplibre chunk), starting from `pinStart`.
- **Place panel** (`?place=` / `?saved=`, `PlaceDetailPanel`): name and category edit in place (`PATCH /geo-api/places/{id}`); the saved place labelling it shows label, notes, favorite and Remove (`PATCH`/`DELETE /geo-api/me/places/{id}`), or a Save place button (`POST /geo-api/me/places`). Items here use `@lupira/maps-domain/placeItems`. A saved place without a gazetteer link (hit, list row or `?saved=`) shows its label, coordinates + OSM link and the saved-place fields (Remove closes the panel), pinned from its own coordinates.
- **Make it a place** (raw saved spot, `useLinkSavedToPlace`): `POST /geo-api/places/from-pin` under the spot's label, then `@lupira/maps-domain/savedPlaces` `linkPlan`: no other saved place labels that place → `PATCH` the spot `{ placeId }` (geo clears its raw coordinate); one does → that entry is kept, the spot's notes appended to it, and the spot deleted. The panel then opens the place.
- **Phone width** (below MUI `sm`): the controls are one row, search + a Filters chip (bottom `Drawer` with range, layers and the movement legend) + List, above the jump strip. The index and place panels become bottom sheets, and `FlyToPlace` offsets the camera so the place lands above the sheet. `AppShell` pads `main` by `BOTTOM_NAV_HEIGHT` + the safe-area inset below `md`, where `BottomNav` is fixed. Touch screens get no zoom buttons (pinch).
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
- **Taps are the map's, not the sources'**: `queryRenderedFeatures` per layer under the finger → `@lupira/maps-domain/mapHits` → `MapPreviewSheet` (one hit = card with its Open, several = list); a cluster that can't split past `clusterMaxZoom` lists its leaves. The tapped or handed-over point gets `SelectionPin`. Saved places (also raw-coordinate ones) and hotspots with a place offer Open place → `PlaceDetail`.
- **Long-press** drops a pin and opens `SavePlaceSheet`: the name is prefilled from `GET /geo-api/geocode/reverse?precision=Building` (`pinNameSuggestion`, `@danbro96/lupira-domain-places/pin`). Save (`useSavePinnedPlace`) resolves the pin to a catalog place with `POST /geo-api/places/from-pin` (a place within 25 m with a similar name is matched, else one is created with address + containment; a blank name lets geo auto-name it), then saves it (`POST /geo-api/me/places` with `placeId`) unless a saved place already labels that place.
- **Places** (header bookmark action, `lupiramaps://places`): saved places, favorites first (`@lupira/maps-domain/savedPlaces`); a row flies the map there (`Map` `at`), its info button opens `PlaceDetail`.
- **PlaceDetail** (`{ placeId?, savedPlaceId? }`): the saved place (label, notes, favorite, remove) and/or the gazetteer place (name, category via `PATCH /geo-api/places/{id}`), entry codes, and the items that reference it (`GET /api/items/by-place/{placeId}`, tap opens cal). Writes are `useMutation`s in `state/usePlaces.ts` that invalidate `['map','saved-places']` and `['places']`; edits are disabled offline.
- **Hand-offs** go through `ui/siblingLinks.ts`: the sibling app's scheme (`appLinks`), else its https page. Inbound, `lupiramaps://at/{lon},{lat}` and `lupiramaps://?at=…&layers=…` open the map, `lupiramaps://places` the Places list over it (`ui/navigation/linking.ts`, `initialRouteName: 'Map'`); `layers` naming photos shows the photo layer for that visit.
- An `at` target waits for `onDidFinishLoadingMap` — the map mounts after its style loads, so an early `easeTo` is silently dropped.
- One age limit (`prefs.mapSince`, `@lupira/maps-domain/mapWindow`) bounds events, photos, hotspots and movement; layer toggles persist in `prefs.mapLayers`.
- A jump strip under the header (`QuickPlacesStrip`, `useQuickPlaces`) lists your current Home/Work residencies and your parents' home, then the next placed events; a jump frames by place type (`@danbro96/lupira-domain-maps/mapZoom`) and an event opens its preview card.

### Reads and the offline cache

Every layer reads REST through hand-written hooks: `useQuery(onlineQuery(key, fetcher))` (`@danbro96/lupira-expo-query`) over the generated body-only *fetchers* (`@lupira/maps-api/fetch/*`, which throw `ApiError`; a 404 is `e.status === 404`): occurrences (`GET /api/items` from/to), calendars, residencies + contacts + relations, place lookup, saved places, place detail + its items, hotspots, photo cells, movement. Reverse geocoding keys under `geocode`, outside the persisted roots.

- `sync/queryClient.ts` is `createAppQueryClient`: the read cache persists over `expo-sqlite/kv-store`, only the key roots the map draws (`map`, `places`, `occurrences`, `calendars`, `contacts`, `me`, `movement`), `maxAge` 7 days, `buster` = app version. `onlineQuery` = fresh 5 min, one retry for transient failures only.
- Cached values must be JSON: `usePlaceCoords` caches the lookup list and builds its `Map` in `useMemo` (a `Map` serializes to `{}`).
- `App.tsx` calls `connectOnlineManager()` (NetInfo internet reachability drives `onlineManager`, so reads pause on the cached data offline instead of failing) and `connectFocusManager()` (stale queries refetch on return to the foreground). Screens read the flag via `useOnline()`; the map shows the shared `StatusBanner` over `offlineBannerState(online)` while offline, above its basemap-unavailable notice.
- Auth is `createAuthStore` (`@danbro96/lupira-expo-oidc/authStore`, keys `lupira.maps.*`). Signing out clears the cache; a sign-in as a different account (or the first one on the install) clears it and resets location tracking before the session lands (`onAccountChange`, see below).

## Location uploader (mobile)

The phone is the estate's only GPS uploader. `sync/locationRecorder.ts` records under an Android foreground service into `location_fix_queue` (SQLite `lupira-maps.db` via `@danbro96/lupira-expo-sqlite`; migration 1 is the queue, 2 the `meta` table holding the seq counter, cadence and tracking settings); `sync/locationUploader.ts` drains it, also from `sync/backgroundTask.ts`.

- Ingest is hand-written (`sync/locationIngest.ts`): it authenticates with `Authorization: DeviceKey …`, which the generated client cannot express (the OpenAPI doc declares only a Bearer scheme). It posts to the BFF's `/ingest/location*` (`device` group), which checks the key's shape and forwards it untouched.
- The device key is shown once at registration and lives in SecureStore, never in SQLite.
- An account switch (`useLocationTracking.resetForNewAccount`) stops the recorder, disables tracking, waits out any in-flight drain, then deletes the device key and empties the queue, so no fix leaves with the previous account's key. The phone is unpaired until the new account enables tracking again; the old device stays registered server-side.
- NDJSON lines are snake_case and must never carry principal/device ids — the server rejects the whole line.
- Cadence adapts to speed but **accuracy stays High in every profile**: Balanced is ~100 m, above the server's 50 m cutoff, and still-mode is exactly when visits (80 m / ≥8 min) are detected — a cheap still profile silently yields zero visits.
- Cadence changes call `startLocationUpdatesAsync` again rather than stop+start (Android 12+ forbids restarting a location FGS from the background). From a headless wake that call throws (no FGS start while backgrounded), so the switch only saves the profile; the next foreground applies it.
- expo-location 57 restores task options from JSON after a process restart and reads `timeInterval` as `Long` (and `distanceInterval`/`accuracy` as `Int`), so the restored Integer was dropped and the OS request fell back to 2 s. `patches/expo-location+57.0.20.patch` casts through `Number` (applied by `postinstall: patch-package`); `expo.autolinking.android.buildFromSource: ["expo-location"]` in `apps/mobile/package.json` makes Gradle compile that source instead of the shipped prebuilt AAR. Re-check both on every expo-location bump. JS bounds the damage on builds without the fix:
  - Every foreground (app start and `active`) re-issues the saved profile via `startRecording`, also when the task is live.
  - `deferredUpdatesInterval` (read correctly after a restore) batches background wakes to about the profile interval. No `deferredUpdatesDistance`: both thresholds must hold, so a parked phone would never report and still-mode visits would vanish.
  - `admitFix` queues a fix only when it is the profile's spacing after the last kept one (`meta location.lastKeptFixMs`, 0.8 slack for jitter); a fix moving faster than the profile keeps its own pace; a gap always admits.
  - The recorder uploads only at ≥ 50 queued rows or 15 min after the last successful upload (`meta location.lastUploadAt`); foreground, manual and background-task drains are ungated.
- The task is registered in `index.ts`, not from a React effect — a headless restart has no App component.
