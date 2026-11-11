import { describe, expect, it } from 'vitest';

import { fromRoot } from '../support/paths';

// Every lookup that finds no Project of its own falls back to the one Project marked `default`, whatever its
// place in the list, the configured list's or a list passed in.

type Project = { slug: string; prefix: string; milestonePrefix: string; default?: boolean };
type Wave = { letter: string | undefined; number: number };
type Lookup<T> = (key: T, projects?: Project[]) => Project | null;

// The scripts are plain JavaScript with no declarations; a path read at run time keeps them untyped here.
const load = (path: string) => import(fromRoot(path));
const { PROJECTS, projectOfId, projectOfMilestone, projectOfWave } = (await load(
  'scripts/task-projects.mjs',
)) as {
  PROJECTS: Project[];
  projectOfId: Lookup<string>;
  projectOfMilestone: Lookup<string | null>;
  projectOfWave: Lookup<Wave>;
};
const { projectOfDocPath } = (await load('scripts/tasks-md.mjs')) as {
  projectOfDocPath: Lookup<string>;
};

// An invented pair with the default second, so a fallback that takes the first Project picks the wrong one.
const PAIR: Project[] = [
  { slug: 'other', prefix: 'Q', milestonePrefix: 'Q · ' },
  { slug: 'main', prefix: 'T', milestonePrefix: '', default: true },
];
const [OTHER, MAIN] = PAIR;

const configuredDefault = () => {
  const defaults = PROJECTS.filter((project) => project.default);
  // Precondition: the configuration marks exactly one default.
  expect(defaults).toHaveLength(1);
  return defaults[0];
};

describe('the default Project', () => {
  it('owns a milestone no Project prefixes, and a prefixed one goes to its own', () => {
    expect(projectOfMilestone('Wave 07', PAIR)).toBe(MAIN);
    expect(projectOfMilestone('Q · Wave 01', PAIR)).toBe(OTHER);
    expect(projectOfMilestone('Wave 07')).toBe(configuredDefault());
  });

  it('owns no milestone at all, nor a neutral one', () => {
    expect(projectOfMilestone(null, PAIR)).toBeNull();
    expect(projectOfMilestone('Retired — not done', PAIR)).toBeNull();
  });

  it('owns a wave row whose letter no Project has', () => {
    expect(projectOfWave({ letter: undefined, number: 7 }, PAIR)).toBe(MAIN);
    expect(projectOfWave({ letter: 'Q', number: 1 }, PAIR)).toBe(OTHER);
  });

  it('owns a task id whose first letter no Project has', () => {
    expect(projectOfId('Z3.1', PAIR)).toBe(MAIN);
    expect(projectOfId('q2.4', PAIR)).toBe(OTHER);
    expect(projectOfId('T1.1', PAIR)).toBe(MAIN);
    expect(projectOfId('Z3.1')).toBe(configuredDefault());
  });

  it('owns TASKS.md, a file directly under tasks/, and a directory no Project names', () => {
    expect(projectOfDocPath('claude-docs/TASKS.md', PAIR)).toBe(MAIN);
    expect(projectOfDocPath('claude-docs/tasks/m3.md', PAIR)).toBe(MAIN);
    expect(projectOfDocPath('claude-docs/tasks/unknown/m3.md', PAIR)).toBe(MAIN);
    expect(projectOfDocPath('claude-docs/waves/other/01.md', PAIR)).toBe(OTHER);
    expect(projectOfDocPath('claude-docs/tasks/m3.md')).toBe(configuredDefault());
  });
});
