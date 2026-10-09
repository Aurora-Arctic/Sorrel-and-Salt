import { readFileSync } from 'node:fs';
import picomatch from 'picomatch';
import { describe, expect, inject, it } from 'vitest';

import config, { DB_FREE } from '../../vitest.config.mts';
import { fromRoot } from '../support/paths';
import type { ProjectGlobs } from './types';

// Every `db` file waits on a fresh clone of the seeded database before it
// runs, so a file that never reaches the database pays for nothing and
// belongs in `unit` (MB.189; claude-docs/testing/where-tests-live.md, "Where
// tests live"). Whether a file queries is read off its text: it opens a client
// of its own, or calls into the app as one of the seeded fixture users, or
// reaches the repository. A file with none of them is named in the config's
// DB_FREE instead.

const REACHES_THE_DATABASE: [string, RegExp][] = [
  ['the harness client', /\buseTestDatabase\(/],
  ['a postgres client of its own', /from 'postgres'|import\('postgres'\)/],
  ['a database cloned or seeded', /support\/seeded-database'/],
  ["the repository's scratch tables", /support\/db\/probe-tables'/],
  ['a service called as a fixture user', /support\/as-user'/],
  ['the repository or the connection', /from '@\/db\/(repository|connection)'/],
];

const reachesTheDatabase = (file: string) => {
  const text = readFileSync(fromRoot(file), 'utf8');
  return REACHES_THE_DATABASE.some(([, pattern]) => pattern.test(text));
};

const projects = (config.test?.projects ?? []) as ProjectGlobs[];
const db = projects.find(({ test }) => test.name === 'db');
const included = picomatch(db?.test.include ?? []);
const excluded = picomatch(db?.test.exclude ?? []);
const testFiles = inject('repoFiles').filter((file) => /\.test\.tsx?$/.test(file));
const dbFiles = testFiles.filter((file) => included(file) && !excluded(file));
const dbFree = testFiles.filter((file) => included(file) && excluded(file));

describe('MB.189: every db-project file reaches the database', () => {
  // Preconditions: the config was read and the scan found the project — an
  // empty one satisfies the `toEqual([])` below — and the markers tell the
  // two kinds apart, since DB_FREE's files, which never query, carry none.
  it('finds the db project, and the files it leaves to unit', () => {
    expect(db?.test.exclude).toEqual(DB_FREE);
    expect(dbFiles.length).toBeGreaterThan(100);
    expect(dbFiles).toContain('tests/db/test-database-isolation.test.ts');
    expect(dbFree).toContain('tests/modules/coven/services/access-control.test.ts');
    expect(dbFree.filter(reachesTheDatabase)).toEqual([]);
  });

  it('has no file that never reaches the database', () => {
    expect(dbFiles.filter((file) => !reachesTheDatabase(file))).toEqual([]);
  });
});
