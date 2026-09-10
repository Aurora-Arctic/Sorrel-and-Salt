#!/usr/bin/env node
// M0.35 regression check — .ladle/config.mjs's addons.theme.defaultState was
// silently flipped once already (M0.31 'auto', M0.32 back to 'dark', with the
// explaining comment left pointing at the wrong value in between). 'dark' is
// the confirmed intent: claude-docs/design-decisions/m0.34-doc-archive-and-compression-pass.md.
//
// This is a standalone script, not a Vitest test, because Vitest hasn't
// landed yet (M1.7) — it follows the check-component-stories.ts pattern
// instead: a plain npm script wired into pre-commit.
//
// Usage: npm run check:theme-default

import config from '../.ladle/config.mjs';

const EXPECTED = 'dark';
const actual = config.addons?.theme?.defaultState;

if (actual !== EXPECTED) {
  console.error(
    `.ladle/config.mjs: addons.theme.defaultState is '${actual}', expected '${EXPECTED}'.\n` +
      `'dark' is the confirmed intent (see claude-docs/design-decisions/m0.34-doc-archive-and-compression-pass.md) — ` +
      `if this changed on purpose, update this check and the comment above defaultState alongside it.`,
  );
  process.exit(1);
}

console.log(`check:theme-default — addons.theme.defaultState is '${EXPECTED}', as expected.`);
