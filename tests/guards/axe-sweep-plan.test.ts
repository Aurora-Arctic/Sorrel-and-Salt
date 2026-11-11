import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import * as scanList from '../e2e/axe-scans';
import { MODAL_SCANS, ROUTE_SCANS, type Persona } from '../e2e/axe-scans';
import { fromRoot } from '../support/paths';

// The accessibility sweep's tests, as tests/e2e/axe-scans.ts plans them: one test per route group or modal group
// and per person, so `fullyParallel` can spread the sweep across workers and shards instead of one test holding
// every page a person sees. Each test signs in once, as one person, so it never mixes two people's scans.

type SweepTest = {
  title: string;
  kind: 'pages' | 'modals';
  as: Persona;
  scans: readonly string[];
};

const plan = (scanList as Record<string, unknown>).SWEEP_TESTS as readonly SweepTest[] | undefined;

const pagePairs = ROUTE_SCANS.flatMap(({ route, as }) =>
  (as as readonly Persona[]).map((persona) => `${persona} ${route}`),
);
// Today's grouping, one test per person for pages and one for modals: the plan must split it finer.
const personaBuckets = [
  ...new Set(ROUTE_SCANS.flatMap(({ as }) => (as as readonly Persona[]).map((p) => `pages ${p}`))),
  ...new Set(MODAL_SCANS.map(({ as }) => `modals ${as as Persona}`)),
];
const largestBucket = Math.max(
  ...personaBuckets.map((bucket) => {
    const [kind, persona] = bucket.split(' ');
    return kind === 'pages'
      ? ROUTE_SCANS.filter(({ as }) => (as as readonly string[]).includes(persona)).length
      : MODAL_SCANS.filter(({ as }) => as === persona).length;
  }),
);

describe('the accessibility sweep plan', () => {
  it('is exported beside the scan list', () => {
    expect(Array.isArray(plan)).toBe(true);
    expect(plan?.length).toBeGreaterThan(0);
  });

  it('scans every page once as each person it lists, in a test signed in as that person', () => {
    const pages = (plan ?? []).filter(({ kind }) => kind === 'pages');
    const planned = pages.flatMap(({ as, scans }) => scans.map((route) => `${as} ${route}`));

    // Precondition: the scan list holds pages scanned as more than one person.
    expect(pagePairs.length).toBeGreaterThan(ROUTE_SCANS.length);
    expect([...planned].sort()).toEqual([...pagePairs].sort());
  });

  it('opens every modal once, in a test signed in as the person it lists', () => {
    const modals = (plan ?? []).filter(({ kind }) => kind === 'modals');
    const planned = modals.flatMap(({ as, scans }) => scans.map((id) => `${as} ${id}`));
    const listed = MODAL_SCANS.map(({ id, as }) => `${as as Persona} ${id}`);

    expect(listed.length).toBeGreaterThan(10);
    expect([...planned].sort()).toEqual([...listed].sort());
  });

  it('splits the sweep into more tests than one per person, none as long as the longest is today', () => {
    const tests = plan ?? [];

    // Precondition: today's longest test scans many pages or modals.
    expect(largestBucket).toBeGreaterThan(5);
    expect(tests.length).toBeGreaterThan(personaBuckets.length);
    expect(Math.max(0, ...tests.map(({ scans }) => scans.length))).toBeLessThan(largestBucket);
    expect(tests.every(({ scans }) => scans.length > 0)).toBe(true);
  });

  it('gives every test its own title', () => {
    const titles = (plan ?? []).map(({ title }) => title);

    expect(titles.length).toBeGreaterThan(0);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('opens the two-factor warning last in its test, since it signs in an account of its own', () => {
    const holding = (plan ?? []).filter(({ scans }) => scans.includes('two-factor-warning'));

    expect(holding).toHaveLength(1);
    expect(holding[0]?.scans.slice(-1)[0]).toBe('two-factor-warning');
  });

  it('is what the sweep in axe.spec.ts builds its tests from', () => {
    const spec = readFileSync(fromRoot('tests/e2e/axe.spec.ts'), 'utf8');

    expect(spec).toMatch(/\bSWEEP_TESTS\b/);
    expect(spec).not.toMatch(/`every page, as \$\{persona\}`/);
  });
});
