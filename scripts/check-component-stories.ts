#!/usr/bin/env node
// M0.33 gate — no standalone component without a story.
//
// Fails when a directory under src/components/ holds an `index.tsx` but no
// sibling `index.stories.tsx`. The Ladle workshop (M0.30) discovers components
// by that story file; without this check, "every component is in the workshop"
// is something you remember rather than something that is enforced.
//
// Runs from pre-commit (the "pre-commit" array in package.json) and, once the
// CI workflows land, from the build job (M0.17) and the PR gate (M0.20)
// alongside `npm run workshop:build` — which fails the run on a story that
// throws. Both are plain npm scripts so a workflow only has to call them.
//
// Scope is src/components/ only. `.ladle/*.stories.tsx` — the design-language
// reference page and any future workshop-only page the app never imports — is
// deliberately outside it; see .ladle/config.mjs and
// claude-docs/design-decisions/m0.32-component-stories.md.
//
// Not an Oxlint rule: Oxlint has no custom-rule API, and the check is a
// cross-file filesystem assertion ("this directory implies that sibling"),
// not something a single-file linter can express. The task anticipated this.
//
// Usage: npm run check:stories

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');
const COMPONENT_ENTRY = 'index.tsx';
const STORY_FILE = 'index.stories.tsx';

// Every directory at or below src/components/ that holds an `index.tsx`.
// Recurses so a nested component (src/components/Forms/Input/) is covered too.
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

function main(): void {
  let dirs: string[];
  try {
    dirs = componentDirs(COMPONENTS_DIR);
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      // No src/components/ in the tree yet — nothing to police.
      console.log('check:stories — no src/components/ directory; nothing to check.');
      return;
    }
    throw error;
  }

  const missing = dirs.filter((dir) => !readdirSync(dir).includes(STORY_FILE));

  if (missing.length === 0) {
    const n = dirs.length;
    console.log(`check:stories — ${n} component${n === 1 ? '' : 's'}, every one with a story.`);
    return;
  }

  const n = missing.length;
  console.error(`check:stories — ${n} component${n === 1 ? '' : 's'} missing ${STORY_FILE}:\n`);
  for (const dir of missing) {
    console.error(`  ${relative(REPO_ROOT, join(dir, STORY_FILE))}`);
  }
  console.error(
    `\nEvery standalone component ships an index.stories.tsx (CLAUDE.md · Conventions).\n` +
      `Add the file — the Ladle workshop discovers the component by it.`,
  );
  process.exit(1);
}

main();
