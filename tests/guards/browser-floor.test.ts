import { readFileSync } from 'node:fs';
import { features } from 'web-features';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// A web API not yet widely available may be used only behind a `typeof` or `in` check on the same line (claude-docs/styling.md, "Binding rules"; claude-docs/design-decisions/m10.24-browser-floor.md).
// The list prunes itself: an entry fails with "delete this entry" once its `web-features` id is widely available.

interface PastTheFloor {
  pattern: RegExp;
  feature: string;
}

const PAST_THE_FLOOR: PastTheFloor[] = [
  {
    feature: 'set-methods',
    pattern:
      /\.(union|intersection|difference|symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\(/,
  },
  { feature: 'promise-try', pattern: /\bPromise\.try\b/ },
  { feature: 'regexp-escape', pattern: /\bRegExp\.escape\b/ },
  { feature: 'float16array', pattern: /\bFloat16Array\b|\bMath\.f16round\b/ },
  { feature: 'navigation', pattern: /\bwindow\.navigation\b/ },
];

/** Server-only by CLAUDE.md rules 1 and 2: the browser never receives them. */
const SERVER_ONLY = [/^src\/db\//, /^src\/modules\/[^/]+\/services\//, /^src\/graphql\//];
const SOURCE = /^src\/.*\.tsx?$/;
const FEATURE_CHECK = /\btypeof\b|['"][\w$]+['"]\s+in\s/;

describe('the browser floor in client-reachable source', () => {
  const clientFiles = inject('repoFiles').filter(
    (file) => SOURCE.test(file) && !SERVER_ONLY.some((server) => server.test(file)),
  );

  it('scans client-reachable source', () => {
    // Precondition: an empty scan would let "no unguarded use" pass for free.
    expect(clientFiles).toContain('src/components/Modal/index.tsx');
  });

  it('keeps no entry for a feature that is now widely available', () => {
    const stale = PAST_THE_FLOOR.filter(({ feature }) => {
      const entry = features[feature];
      // A renamed or split id has no status of its own: the entry needs updating.
      if (entry?.kind !== 'feature') throw new Error(`web-features has no feature "${feature}"`);
      return entry.status.baseline === 'high';
    }).map(({ feature }) => `${feature}: widely available, delete this entry`);

    expect(stale).toEqual([]);
  });

  it('uses no listed API without a feature check on the same line', () => {
    const unguarded = clientFiles.flatMap((file) =>
      readFileSync(fromRoot(file), 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          PAST_THE_FLOOR.filter(
            ({ pattern }) => pattern.test(line) && !FEATURE_CHECK.test(line),
          ).map(({ feature }) => `${file}:${index + 1} uses ${feature} past the floor`),
        ),
    );

    expect(unguarded).toEqual([]);
  });
});
