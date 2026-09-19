import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';
import ladleConfig from '../../.ladle/config.mjs';

// The two workshop guards (claude-docs/workshop.md, "Commands and gates"):
// every directory under src/components/ holding an `index.tsx` has a sibling
// `index.stories.tsx` — the Ladle workshop discovers components by that file,
// and `.ladle/*.stories.tsx` is deliberately out of scope — and
// `.ladle/config.mjs` opens dark, matching globals.scss. A test rather than an
// Oxlint rule: Oxlint has no custom-rule API, and "this directory implies that
// sibling" is a cross-file assertion. The walk is proven on a throwaway tree
// first, so a green run means it found nothing rather than looked at nothing.

const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');
const COMPONENT_ENTRY = 'index.tsx';
const STORY_FILE = 'index.stories.tsx';

/** Every directory at or below `dir` holding an `index.tsx`; nested components count. */
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
  // Two components missing a story (one nested), one covered, and a directory
  // that is not a component at all.
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

  // Precondition: a missing src/components/, or a walk that stopped short,
  // would report nothing missing too.
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
