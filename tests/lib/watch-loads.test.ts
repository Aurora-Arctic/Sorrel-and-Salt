import { describe, expect, it } from 'vitest';
import { watchLoads } from '../support/preload';

// The preload tests count a module's evaluations; tests/support/preload.ts

// A test that intends on a control starts a form loading and may end before that load finishes. The
// form's imports then land under the next test's watch, which must not count them (CI saw the Edit
// Stock watch count `react-hook-form` from the Annotate test before it). The two tests below run in
// this order: the first leaves the real form's load running, the second watches what it brings in.
const FORM = '@/components/StockDialog/form';
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('watchLoads', () => {
  it('finishes a load the test started before its mocks come off', () => {
    watchLoads(['@/lib/slugify']);
    void import(FORM);
  });

  it('counts nothing a previous test started', async () => {
    const loaded = watchLoads(['react-hook-form']);
    await settle(750);
    expect(loaded()).toEqual([]);
    // Precondition: the watch does count the form's import when this test makes it.
    await import(FORM);
    expect(loaded()).toEqual(['react-hook-form']);
  });

  it('counts a module once when two importers ask for it at the same moment', async () => {
    const loaded = watchLoads(['react-hook-form']);
    await Promise.all([
      import('@/components/Field/use-field'),
      import('@/components/Field/text-field'),
      import('@/components/Field/select-field'),
      import('@/lib/graphql-failure'),
      import('@/components/StockDialog/form'),
    ]);
    expect(loaded()).toEqual(['react-hook-form']);
  });
});
