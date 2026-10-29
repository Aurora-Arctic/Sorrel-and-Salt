import { readFileSync } from 'node:fs';
import { features } from 'web-features';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// The browser floor is Baseline Widely Available (claude-docs/styling.md, "Binding rules"; claude-docs/design-decisions/m10.24-browser-floor.md); stylelint holds the CSS and this holds the JavaScript:
// a web API not yet in all four engines for 30 months may be used only behind a `typeof` or `in` check on the same line, so an older engine skips it instead of throwing.
// The list is hand-kept and prunes itself: each entry names a `web-features` id and the test fails with "delete this entry" once that feature is widely available. An empty list is a pass.

interface PastTheFloor {
  /** What the API looks like in source. */
  pattern: RegExp;
  /** The `web-features` id whose status says whether it is past the floor. */
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
/** A feature check on the line: `typeof Promise.try`, `'try' in Promise`. */
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
