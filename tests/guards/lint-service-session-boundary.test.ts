import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A service receives the session as its first argument; it never reads the
// request to find one (claude-docs/auth.md, "Route protection"). A service
// that could would stop being callable from a test, a script or the GraphQL
// context, and `asUser(A)` would stop meaning anything. `.oxlintrc.json`'s
// `src/services/**` override makes that an import error. The override
// replaces the top-level rule rather than merging with it (see
// lint-db-client-boundary.test.ts), so this also asserts the top-level bans
// survived the restatement.

const RULE = 'eslint(no-restricted-imports)';
const oxlint = join(REPO_ROOT, 'node_modules/.bin/oxlint');
const config = join(REPO_ROOT, '.oxlintrc.json');

/** Untracked, gitignored, and removed in `afterAll`. */
const PROBE_DIR = 'src/services/__lint-probe-session__';

interface Diagnostic {
  code: string;
  filename: string;
}

const probes = new Map<string, string>();
function probe(name: string, source: string, directory = PROBE_DIR): string {
  const file = `${directory}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Every way a service could reach the request, or the thing that reads it.
const SESSION_SOURCES = [
  'next/headers',
  '@/lib/request-session',
  '../../lib/request-session',
  '@/lib/auth',
  '../../lib/auth',
  'better-auth/cookies',
];
const sessionProbes = SESSION_SOURCES.map((specifier) =>
  probe(
    `read-${specifier.replace(/\W/g, '')}`,
    `import * as m from '${specifier}';\nexport { m };\n`,
  ),
);

// What a service legitimately imports: the `Session` type, and better-auth's
// access-control builder (access-control.ts).
const allowedProbes = [
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
const restatedProbes = [
  probe('client', "import { db } from '@/db/connection';\nexport const d = db;\n"),
  probe('drizzle', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  probe(
    'provider-config',
    "import { clientCredentials } from '@/lib/social-providers-config';\nexport const c = clientCredentials;\n",
  ),
];

// Outside services the session helper is the point: pages call it.
const pageProbe = probe(
  'page',
  "import { requireSession } from '@/lib/request-session';\nexport const r = requireSession;\n",
  'src/app/__lint-probe-session__',
);

let diagnostics: Diagnostic[];
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

beforeAll(() => {
  for (const [file, source] of probes) {
    mkdirSync(join(REPO_ROOT, file, '..'), { recursive: true });
    writeFileSync(join(REPO_ROOT, file), source);
  }
  let stdout: string;
  try {
    stdout = execFileSync(oxlint, ['-c', config, '--format', 'json', ...probes.keys()], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
  } catch (error) {
    // oxlint exits non-zero on errors; the diagnostics are still on stdout.
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  diagnostics = (JSON.parse(stdout) as { diagnostics: Diagnostic[] }).diagnostics;
});

afterAll(() => {
  rmSync(join(REPO_ROOT, PROBE_DIR), { recursive: true, force: true });
  rmSync(join(REPO_ROOT, 'src/app/__lint-probe-session__'), { recursive: true, force: true });
});

describe('M2.7: services receive the session rather than reading it', () => {
  it.each(SESSION_SOURCES.map((specifier, i) => [specifier, sessionProbes[i]]))(
    'bans a service importing %s',
    (_specifier, file) => {
      expect(restricted(file)).toBe(1);
    },
  );

  it.each(allowedProbes)('leaves %s alone', (file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(restatedProbes)('still applies the top-level ban in %s', (file) => {
    expect(restricted(file)).toBe(1);
  });

  it('lets a page call the session helper', () => {
    expect(restricted(pageProbe)).toBe(0);
  });
});
