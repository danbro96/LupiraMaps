# LupiraMaps — agent notes

- BFF pattern: ~/Nextcloud/Familj/DevOps/Guides/bff-pattern.md
- Platform packages (`Lupira.*` NuGet, `@danbro96/lupira-*` npm): ~/Nextcloud/Familj/DevOps/Guides/platform-packages.md. Restore needs `PACKAGES_TOKEN`.
- Shared frontend conventions: ~/Nextcloud/Familj/DevOps/Guides/frontend-estate.md (repo-specific deviations below).
- Deploy config: DevOps `WebApps/lupira-maps-web/` is authoritative; `deploy/compose.yaml` is the genericized example.
- **Purpose**: map client over geo, location, cal, contact and photo REST: self-hosted basemap, saved places + gazetteer curation (`/places`), location history, and the events, residencies and photos that carry a place. Event hits open a read-only card that links to cal; contact hits link to cal, photo hits to photos.
- **BFF**: `src/LupiraMapsBff`. Authentik client `lupira-maps` (web) / `lupira-maps-mobile` (bearer, `aud=lupira-maps`), cookie `__Host-lupira-maps`. YARP → five clusters, prefix stripped, bearer attached: `cal-api` `/api`, `geo-api` `/geo-api`, `location-api` `/location-api`, `contact-api` `/contact-api`, `photo-api` `/photo-api`. No anonymous surface beyond `device`.
- **Scopes**: base five at `Auth:Oidc:Scopes` 0–4; audience scopes from 5 (compose overrides by index).
- **`/depz`**: one anonymous `readyz` probe per `ReverseProxy:Clusters` entry; `X-Probe-Key` = `Depz:ProbeKey`, blank = off.
- **`exposed.json`**: only what the map screens call. Exceptions to "no catch-all":
  - `static`: geo-api `/basemap/{**path}`, GET-only file subtree (glyph ranges can't be enumerated).
  - `device`: location-api `/ingest/location*`, mounted at the upstream path, no transform, `Anonymous`. The BFF gates on `DeviceKey {32hex}.{64hex}` well-formedness (401 before the proxy, never an OIDC redirect); location-api holds the keys. Not in the merged spec, so the uploader is hand-written.
  - Unreachable: `/mcp`, `/internal/*`, `/dav-backend/*`, `/depz`, `/openapi/v1.json`, `/scalar`, `/pingz`.
- **Contract**: `dotnet build` writes `openapi/LupiraMapsBff.json` from `src/LupiraMapsBff/upstream/*.json` filtered by `exposed.json`. `dotnet run --project src/LupiraMapsBff -- --routes` prints the route table.
- **Tests**: `dotnet test LupiraMapsBff.slnx` = unit only; `dotnet test tests/LupiraMapsBff.IntegrationTests` (in-process stub upstream, no Docker). Frontends: `npm run lint && npm run typecheck && npm test`.
- **Workspaces**: `packages/domain` (`@lupira/maps-domain`: map features, hits + labels, map window, quick places, place curation, event span; pure TS consumed as source, never imports generated DTO types), `packages/tokens` (`@lupira/maps-tokens`: layer list, mark sizes, icon concepts, palette extras; same purity), `packages/api` (`@lupira/maps-api`), `apps/web`, `apps/mobile`. Rules other Lupira apps share come from `@danbro96/lupira-domain-*` / `-tokens-*`; cross-app URLs from `@danbro96/lupira-domain-links`.
- **API client** (`packages/api`): orval over the committed contract, `query/*` (web hooks) and `fetch/*` (mobile). `src/transport.ts` wraps `@danbro96/lupira-http/transport`; each app installs its transport (web `installCookieTransport`, mobile `createBearerMutator`). `npm run gen:api` regenerates both; commit the result.
- **Web** (`apps/web`, MUI SPA, Vite 5175 → BFF 5182): `/` = map, `/places` = curation, `?item=` = read-only `EventCard` (Open in calendar). Hand-offs to cal/photos are `webLinks` over `config/siblings.ts` (`VITE_{CAL,MAPS,PHOTOS}_URL`). Layering `data → state → ui` (+ leaf `config/`), eslint-plugin-boundaries v7. Details: `docs/map.md`.
- **Mobile** (`apps/mobile`, Expo 57 "Lupira Maps", slug `lupira-maps`, package `com.lupira.maps`, scheme `lupiramaps`, Authentik client `lupira-maps-mobile`): one root Map screen + Settings / Location / Developer / Debug log. No SQL mirror or sync engine: hand-written `onlineQuery` hooks over the body-only generated *fetchers*; `@danbro96/lupira-expo-query` read cache persisted over `expo-sqlite/kv-store` (allowlisted key roots, 7 days, buster = app version), `onlineManager` driven by NetInfo; auth = `createAuthStore` (`@danbro96/lupira-expo-oidc`), whose account switch wipes the read cache, stops tracking and forgets the device key and fix queue. SQLite (`lupira-maps.db`) holds only the GPS fix queue and its `meta`. Layering `domain → data → sync → state → ui`. Details: `docs/map.md`.
- Dev ports: BFF 5182, Vite 5175. Prod: maps.lupira.com:42480, image `danbro96/lupira-maps-web`.

## Read before touching

- Map (web + mobile), maplibre-gl v6 worker fix, offline read cache, location uploader: `docs/map.md`
