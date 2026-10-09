import { describe, expect, inject, it } from 'vitest';
import {
  belowProbes,
  clientTypeProbes,
  dbProbes,
  deepProbes,
  repositoryIndexProbes,
  repositoryInternalProbes,
  restatedProbes,
  schemaProbes,
  serviceProbes,
  typeOnlyProbes,
  accessBoundary,
} from '../support/lint-probes/access-boundary';

// Resolvers and server components reach services and nothing below them
// (CLAUDE.md rule 1): `.oxlintrc.json`'s override for `src/graphql`, `src/app`,
// `src/components` and a module's `graphql/` and `loaders/` bans a runtime import of anything under `src/db`, so a
// service is the only route from either transport to the database
// (claude-docs/graphql/access-boundary.md, "The access boundary"). `import type` stays legal —
// it is erased at compile time and can reach nothing, and it is how a resolver
// names a row type. A module's `schema/` files are reachable at runtime from
// above: a table object is inert without the client or `drizzle-orm`, and both
// are banned there. A module's `services/` are not — they are reached through
// the module's index, and the deep import is banned by the same rule
// (claude-docs/modules.md, "The boundary"). The override replaces the top-level
// rule rather than merging with it (see lint-db-client-boundary.test.ts), so
// the restated bans are probed too.
//
// The probes are tests/support/lint-probes/access-boundary.ts's, written and
// linted once by the unit project's setup with every other lint guard's
// (MB.184); this file reads its diagnostics off that run.

const RULE = 'eslint(no-restricted-imports)';

/** A phrase from the boundary group's message, which oxlint reports as `help`. */
const BOUNDARY_MESSAGE = 'reach the database only through a service';

/** The same for the module deep-import group. */
const DEEP_IMPORT_MESSAGE = 'a deep import is a boundary violation';

/** The same for the repository's internal files. */
const REPOSITORY_INTERNAL_MESSAGE = 'Import the repository through its index';

const diagnostics = inject('lintDiagnostics');
const restricted = (file: string) =>
  diagnostics.filter((d) => d.code === RULE && d.filename === file).length;
const withHelp = (file: string, phrase: string) =>
  diagnostics.filter(
    (d) => d.code === RULE && d.filename === file && (d.help ?? '').includes(phrase),
  ).length;
const boundary = (file: string) => withHelp(file, BOUNDARY_MESSAGE);
const deep = (file: string) => withHelp(file, DEEP_IMPORT_MESSAGE);
const repositoryInternal = (file: string) => withHelp(file, REPOSITORY_INTERNAL_MESSAGE);

describe('M3.9: resolvers and server components reach services and nothing below them', () => {
  // Precondition: the shared run was pointed at every probe here, and drew a
  // diagnostic from at least one — otherwise every "0 diagnostics" below is
  // true of a run that never looked.
  it('had its probes linted', () => {
    expect(inject('lintedFiles')).toEqual(
      expect.arrayContaining([...accessBoundary.probes.keys()]),
    );
    expect(dbProbes.some(([, , file]) => restricted(file) > 0)).toBe(true);
  });

  it.each(dbProbes)('bans %s importing %s at runtime', (_directory, _specifier, file) => {
    expect(boundary(file)).toBe(1);
  });

  it.each(typeOnlyProbes)('lets %s name a database type', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(clientTypeProbes)('still bans %s naming the client as a type', (_directory, file) => {
    expect(restricted(file)).toBe(1);
  });

  it.each(serviceProbes)('lets %s import a service as %s', (_directory, _specifier, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(schemaProbes)('lets %s import a module schema file at runtime', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });

  it.each(deepProbes)(
    "bans %s reaching a module's internals by its %s, with the message that names the index",
    (_directory, _name, file) => {
      expect(deep(file)).toBe(1);
    },
  );

  it.each(restatedProbes)('still applies in %s the top-level %s ban', (_directory, _name, file) => {
    expect(restricted(file)).toBe(1);
  });

  it.each(belowProbes)('leaves %s free to import the database layer', (_directory, file) => {
    expect(restricted(file)).toBe(0);
  });
});

describe('the repository is reached through its index (claude-docs/db/repository-files.md)', () => {
  it.each(repositoryInternalProbes)(
    'bans %s importing a repository-internal file by its %s',
    (_directory, _name, file) => {
      expect(repositoryInternal(file)).toBe(1);
    },
  );

  it.each(repositoryIndexProbes)('lets %s import the repository’s index', (_directory, file) => {
    expect(repositoryInternal(file)).toBe(0);
  });
});
