import type { Route } from 'next';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { compendiumEntryPath } from '@/lib/compendium-path';

describe('compendiumEntryPath', () => {
  it('builds a compendium entry’s public address from its slug', () => {
    expect(compendiumEntryPath('testwort')).toBe('/compendium/ingredients/testwort');
  });

  it('encodes the slug, so no value can add a segment or a query of its own', () => {
    expect(compendiumEntryPath('test wort/x?y')).toBe(
      '/compendium/ingredients/test%20wort%2Fx%3Fy',
    );
  });

  it('answers a typed route, so no caller casts', () => {
    expectTypeOf(compendiumEntryPath('testwort')).toEqualTypeOf<Route>();
  });
});
