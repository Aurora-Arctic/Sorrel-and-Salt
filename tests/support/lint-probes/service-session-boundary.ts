import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-service-session-boundary.test.ts: a service
// receives the session as its first argument and never reads the request to
// find one. Written and linted once by unit-global-setup.ts.

/** Untracked, gitignored, and removed once linted. */
const PROBE_DIR = 'src/modules/coven/services/__lint-probe-session__';
const PAGE_PROBE_DIR = 'src/app/__lint-probe-session__';

const probes = new Map<string, string>();
function probe(name: string, source: string, directory = PROBE_DIR): string {
  const file = `${directory}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Every way a service could reach the request, or the thing that reads it.
export const SESSION_SOURCES = [
  'next/headers',
  '@/lib/request-session',
  '../../../../lib/request-session',
  '@/lib/auth',
  '../../../../lib/auth',
  'better-auth/cookies',
];
export const sessionProbes = SESSION_SOURCES.map((specifier) =>
  probe(
    `read-${specifier.replace(/\W/g, '')}`,
    `import * as m from '${specifier}';\nexport { m };\n`,
  ),
);

// What a service legitimately imports: the `Session` type, and better-auth's
// access-control builder (access-control.ts).
export const allowedProbes = [
  probe(
    'session-type',
    "import type { Session } from '@/lib/session';\nexport type S = Session;\n",
  ),
  probe(
    'access-control',
    "import { createAccessControl } from 'better-auth/plugins/access';\nexport const c = createAccessControl;\n",
  ),
];

// The restated top-level bans, which the override would silently drop.
export const restatedProbes = [
  probe('client', "import { db } from '@/db/connection';\nexport const d = db;\n"),
  probe('drizzle', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  probe(
    'provider-config',
    "import { clientCredentials } from '@/lib/social-providers-config';\nexport const c = clientCredentials;\n",
  ),
];

// Outside services the session helper is the point: pages call it.
export const pageProbe = probe(
  'page',
  "import { requireSession } from '@/lib/request-session';\nexport const r = requireSession;\n",
  PAGE_PROBE_DIR,
);

export const serviceSessionBoundary: ProbeSet = {
  name: 'lint-service-session-boundary',
  probes,
  directories: [PROBE_DIR, PAGE_PROBE_DIR],
  files: [],
};
