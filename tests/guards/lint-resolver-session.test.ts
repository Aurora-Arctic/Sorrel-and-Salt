import { describe, expect, inject, it } from 'vitest';
import {
  HELPERS,
  narrowingProbes,
  otherErrorProbes,
  restatedProbes,
  resolverSession,
  transportProbe,
} from '../support/lint-probes/resolver-session';

// A module's resolver narrows the session with `sessionOf(context)` and a
// loader over a signed-in service is `defineSignedInLoader`: the inline
// `if (!session) throw new Forbidden()` is written once, in
// src/graphql/context-helpers.ts (MB.212). oxlint has no
// `no-restricted-syntax` to refuse the statement, so `.oxlintrc.json` refuses
// what it cannot be written without: a runtime import of `Forbidden` in
// `src/modules/*/graphql/**` and `src/modules/*/loaders/**`. Refusing is the
// service's (CLAUDE.md rule 1), so neither directory has another use for it.
// The override replaces the transport's rather than merging with it, so this
// also asserts the transport's bans survived the restatement.
//
// The probes are tests/support/lint-probes/resolver-session.ts's, written and
// linted once by the unit project's setup with every other lint guard's
// (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

const diagnostics = inject('lintDiagnostics');
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file);
/** The diagnostics a file drew for this ban, told from the others by its help. */
const narrowed = (file: string) =>
  restricted(file).filter((d) => d.help?.includes('sessionOf(context)'));

describe('MB.212: a module resolver narrows the session through sessionOf', () => {
  // Precondition: the shared run was pointed at every probe and helper here,
  // and drew this ban's diagnostic from at least one probe.
  it('had its probes linted', () => {
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...resolverSession.probes.keys(), ...HELPERS]),
    );
    expect(narrowingProbes.some((file) => narrowed(file).length > 0)).toBe(true);
  });

  it.each(narrowingProbes)('refuses the inline narrowing in %s', (file) => {
    expect(narrowed(file)).toHaveLength(1);
  });

  it.each(otherErrorProbes)('leaves the other errors importable in %s', (file) => {
    expect(restricted(file)).toEqual([]);
  });

  it('leaves the transport its own refusal', () => {
    expect(restricted(transportProbe)).toEqual([]);
  });

  it.each(HELPERS)('exempts %s, which writes the refusal once', (file) => {
    expect(restricted(file)).toEqual([]);
  });

  it.each(restatedProbes)("still applies the transport's ban in %s", (file) => {
    expect(restricted(file).length).toBeGreaterThan(0);
  });
});
