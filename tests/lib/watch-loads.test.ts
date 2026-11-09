import { describe, expect, it } from 'vitest';
import { watchLoads } from '../support/preload';

// The preload tests count a module's evaluations; tests/support/preload.ts

describe('watchLoads', () => {
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
