/** The Authentik public client for this app (PKCE, no secret). The token's audience fans out to
 *  lupira-maps + lupira-geo + lupira-location + lupira-cal + lupira-contact + lupira-photo via the -aud
 *  scope mappings, so one bearer satisfies the BFF and every upstream it proxies. Refresh grants never
 *  widen scopes — adding an audience here only takes effect after a sign-out/in. */
// No trailing slash — expo-auth-session appends `/.well-known/...` verbatim and Authentik 404s the `//`.
export const OIDC_ISSUER = 'https://auth.lupira.com/application/o/lupira-maps-mobile';
export const OIDC_CLIENT_ID = 'lupira-maps-mobile';
export const OIDC_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'lupira-maps-aud',
  'lupira-geo-aud',
  'lupira-location-aud',
  'lupira-cal-aud',
  'lupira-contact-aud',
  'lupira-photo-aud',
];
export const OIDC_SCHEME = 'lupiramaps';
/** A non-empty path is load-bearing: a bare `lupiramaps://` normalizes to `lupiramaps:` and the
 *  auth-session callback matcher never fires. */
export const OIDC_REDIRECT_PATH = 'oauthredirect';
