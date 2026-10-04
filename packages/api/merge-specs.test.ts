import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = new URL('.', import.meta.url).pathname;
const read = (p: string) => JSON.parse(readFileSync(join(here, p), 'utf8'));

const merged = read('../../openapi/LupiraMapsBff.json');
const contact = read('../../src/LupiraMapsBff/upstream/LupiraContactApi.json');

const schemas = merged.components.schemas as Record<string, unknown>;
const paths = Object.keys(merged.paths) as string[];

// A path is proxied iff its operations carry an upstream's tag, which the merge sets per cluster.
const UPSTREAM_TAGS = new Set(['cal', 'contact', 'geo', 'location', 'photo']);
const isProxied = (path: string) =>
  Object.values(merged.paths[path] as Record<string, { tags?: string[] }>)
    .some((op) => (op?.tags ?? []).some((t) => UPSTREAM_TAGS.has(t)));
const allowlist = read('../../src/LupiraMapsBff/exposed.json');
const clusters = allowlist.clusters as Record<string, { prefix: string }>;
const exposed = allowlist.operations as Record<string, string[]>;

describe('the exposed allowlist', () => {
  it('is the whole of the merged surface — nothing rides along', () => {
    const allowed = new Set(
      Object.entries(exposed).flatMap(([cluster, ops]) =>
        ops.map((op) => {
          const [verb, path] = op.split(' ');
          return `${verb} ${clusters[cluster].prefix}${path}`;
        }),
      ),
    );
    const actual = Object.entries(merged.paths)
      .filter(([path]) => isProxied(path))
      .flatMap(([path, item]) =>
        Object.keys(item as object)
          .filter((verb) => verb !== 'parameters')
          .map((verb) => `${verb.toUpperCase()} ${path}`),
      );
    expect(actual.filter((op) => !allowed.has(op))).toEqual([]);
    expect(actual).toHaveLength(allowed.size);
  });

  // Device ingest authenticates with a device key the generated client cannot express, and the rest
  // are not a browser surface at all.
  it('never exposes ingest, share-links, the user directory or liveness probes', () => {
    const forbidden = /^\/[a-z-]+\/(pingz|ingest|shared|shares|users)(\/|$)/;
    expect(paths.filter((p) => forbidden.test(p))).toEqual([]);
  });
});

describe('merged BFF spec', () => {
  it('separates the paths the BFF declares itself from the proxied ones', () => {
    expect(paths.filter((p) => !isProxied(p)).sort()).toEqual(['/auth/user']);
    const prefixes = ['/api/', '/contact-api/', '/geo-api/', '/location-api/', '/photo-api/'];
    expect(paths.filter(isProxied).filter((p) => !prefixes.some((x) => p.startsWith(x)))).toEqual([]);
  });

  it('drops every /me but contact’s, which alone carries contactId', () => {
    expect(paths.filter((p) => p.endsWith('/me'))).toEqual(['/contact-api/me']);
    expect(Object.keys(schemas).filter((n) => n.includes('MeDto'))).toEqual(['MeDto']);
    expect(schemas.MeDto).toEqual(contact.components.schemas.MeDto);
  });

  it('has no duplicate operationIds', () => {
    const ids = Object.values(merged.paths as Record<string, Record<string, { operationId?: string }>>)
      .flatMap((item) => Object.values(item).map((op) => op?.operationId).filter(Boolean));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('leaves no schema unreachable from a path', () => {
    const refs = new Set<string>();
    JSON.stringify(merged).replace(/"#\/components\/schemas\/([^"]+)"/g, (_m, n: string) => (refs.add(n), _m));
    expect(Object.keys(schemas).filter((n) => !refs.has(n))).toEqual([]);
  });
});
