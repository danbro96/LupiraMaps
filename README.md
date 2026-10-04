# LupiraMaps

Map client for the Lupira APIs: a self-hosted basemap with saved places, location history, and the calendar events, residencies and photos that carry a place.

- **`apps/web`** — React (Vite, MUI) SPA: the map at `/`, gazetteer curation at `/places`. Built into the BFF's `wwwroot`.
- **`apps/mobile`** — Expo app "Lupira Maps" (Android, `com.lupira.maps`): the map, and the phone's GPS recorder and uploader.
- **`packages/api`** (`@lupira/maps-api`) — orval client generated from the BFF contract, in `query` (react-query hooks) and `fetch` flavours.
- **`packages/domain`** (`@lupira/maps-domain`), **`packages/tokens`** (`@lupira/maps-tokens`) — the map's pure rules and visual values; shared rules come from the `@danbro96/lupira-*` platform packages.
- **`src/LupiraMapsBff`** — .NET 10 BFF. Authentik OIDC (`lupira-maps` client, PKCE), tokens in an HttpOnly cookie session (`__Host-lupira-maps`), YARP proxy to geo-, location-, cal-, contact- and photo-api over an allowlist (`exposed.json`). Mobile clients call it with a bearer (`aud=lupira-maps`); devices post GPS fixes to `/ingest/location` with a device key.
- **`openapi/LupiraMapsBff.json`** — the BFF's contract, written by every `dotnet build`.

## Develop

Restoring `@danbro96/*` and `Lupira.*` packages needs `PACKAGES_TOKEN` (a PAT with `read:packages`) in the shell.

```bash
npm ci
dotnet run --project src/LupiraMapsBff                           # http://localhost:5182
npm run dev                                                      # http://localhost:5175 (proxies to the BFF)
npm run gen:api                                                  # contract + client after an exposed.json change
npm run lint && npm run typecheck && npm test
dotnet test LupiraMapsBff.slnx                                   # unit
dotnet test tests/LupiraMapsBff.IntegrationTests                 # integration
```

Mobile: `cd apps/mobile && npx expo start --dev-client` (dev client build via EAS).

## Deploy

`docker build --secret id=packages_token,env=PACKAGES_TOKEN -t danbro96/lupira-maps-web .` Runs at `https://maps.lupira.com`; example compose in `deploy/`. CI: `release.yml` pushes the image from `main`; `mobile-release.yml` builds and submits the Android app from `release/android`; `mobile-ota.yml` publishes an EAS update on demand.
