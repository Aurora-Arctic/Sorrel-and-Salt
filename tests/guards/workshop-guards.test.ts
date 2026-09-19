import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';
import ladleConfig from '../../.ladle/config.mjs';

// MB.38 — the two workshop guards, as tests. Both were standalone scripts
// under scripts/ because Vitest had not landed when they were written (M0.33,
// M0.35); it has since M1.7, and a mechanical guard in this repo is a Vitest
// file — in tests/guards/ since MB.41, in src/test/ when MB.38 moved them.
// Moving them into Vitest is what puts the theme-default guard in CI at all —
// as a script it ran from pre-commit only, which a `--no-verify` skips.
//
//   1. Every standalone component ships a story: a directory under
//      src/components/ holding an `index.tsx` has a sibling
//      `index.stories.tsx`. The Ladle workshop discovers components by that
//      file, so without this "every component is in the workshop" is
//      remembered rather than enforced. Not an Oxlint rule — Oxlint has no
//      custom-rule API, and "this directory implies that sibling" is a
//      cross-file filesystem assertion no single-file linter can express.
//      Scoped to src/components/: `.ladle/*.stories.tsx` is the one
//      workshop-only location, deliberately outside it.
//
//   2. `.ladle/config.mjs` opens the workshop dark. `addons.theme.defaultState`
//      was flipped once already — M0.31 to 'auto', M0.32 back to 'dark', with
//      the comment above it left describing the wrong value in between.
//      'dark' matches the app's dark-first default in globals.scss.
//
// The walk is asserted against a throwaway tree first, so a green run against
// the real one means the guard found nothing rather than that it looked at
// nothing. `workshop:build` (scripts/build-workshop.ts) is not here: a story
// that fails to bundle is a build-time finding, and it stays on the build leg.

const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');
const COMPONENT_ENTRY = 'index.tsx';
const STORY_FILE = 'index.stories.tsx';

/**
 * Every directory at or below `dir` that holds an `index.tsx`. Recurses, so a
 * nested component (src/components/Forms/Input/) is covered too.
 */
function componentDirs(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const found: string[] = [];
  if (entries.some((entry) => entry.isFile() && entry.name === COMPONENT_ENTRY)) {
    found.push(dir);
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(...componentDirs(join(dir, entry.name)));
    }
  }
  return found;
}

/** Component directories under `root` with no story, relative to `root`. */
function missingStories(root: string): string[] {
  return componentDirs(root)
    .filter((dir) => !readdirSync(dir).includes(STORY_FILE))
    .map((dir) => relative(root, dir));
}

describe('every standalone component ships a story', () => {
  // A fixture tree, so the walk is proven to bite before it is trusted on the
  // real one: two components missing a story (one nested), one that has its
  // story, and a directory that is not a component at all.
  let fixture: string;

  beforeAll(() => {
    fixture = mkdtempSync(join(tmpdir(), 'workshop-guards-'));
    for (const [dir, files] of [
      ['Bare', [COMPONENT_ENTRY]],
      ['Forms/Input', [COMPONENT_ENTRY]],
      ['Covered', [COMPONENT_ENTRY, STORY_FILE]],
      ['Forms', ['index.scss']],
    ] as const) {
      mkdirSync(join(fixture, dir), { recursive: true });
      for (const file of files) writeFileSync(join(fixture, dir, file), '');
    }
  });

  afterAll(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  it('reports a component directory with index.tsx and no index.stories.tsx, nested or not', () => {
    expect(missingStories(fixture).sort()).toEqual(['Bare', 'Forms/Input']);
  });

  it('leaves a component with its story, and a directory with no index.tsx, alone', () => {
    const missing = missingStories(fixture);

    expect(missing).not.toContain('Covered');
    expect(missing).not.toContain('Forms');
  });

  // The precondition, so the assertion after it cannot pass vacuously: a
  // src/components/ that had gone missing, or a walk that stopped short, would
  // report nothing missing too.
  it('finds the components that exist in src/components/', () => {
    expect(componentDirs(COMPONENTS_DIR)).toContain(join(COMPONENTS_DIR, 'ThemeToggle'));
  });

  it('finds no component under src/components/ without one', () => {
    expect(missingStories(COMPONENTS_DIR)).toEqual([]);
  });
});

describe('.ladle/config.mjs', () => {
  it("opens the workshop dark — addons.theme.defaultState is 'dark'", () => {
    expect(ladleConfig.addons?.theme?.defaultState).toBe('dark');
  });
});
