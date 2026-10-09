import { describe, expect, inject, it } from 'vitest';
import {
  SESSION_SOURCES,
  allowedProbes,
  pageProbe,
  restatedProbes,
  serviceSessionBoundary,
  sessionProbes,
} from '../support/lint-probes/service-session-boundary';

// A service receives the session as its first argument; it never reads the
// request to find one (claude-docs/auth/route-protection.md, "Route protection"). A service
// that could would stop being callable from a test, a script or the GraphQL
// context, and `asUser(A)` would stop meaning anything. `.oxlintrc.json`'s
// `src/modules/*/services/**` override makes that an import error. The override
// replaces the top-level rule rather than merging with it (see
// lint-db-client-boundary.test.ts), so this also asserts the top-level bans
// survived the restatement.
//
// The probes are tests/support/lint-probes/service-session-boundary.ts's,
// written and linted once by the unit project's setup with every other lint
// guard's (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

const diagnostics = inject('lintDiagnostics');
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;

describe('M2.7: services receive the session rather than reading it', () => {
  // Precondition: the shared run was pointed at every probe here, and drew a
  // diagnostic from at least one.
  it('had its probes linted', () => {
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...serviceSessionBoundary.probes.keys()]),
    );
    expect(sessionProbes.some((file) => restricted(file) > 0)).toBe(true);
  });

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
