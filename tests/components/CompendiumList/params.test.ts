import { describe, expect, it } from 'vitest';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';

const mode = COMPENDIUM_PARAMS.entries.categoryMode;

describe('the categoryMode parameter', () => {
  it('reads any, and everything else as all', () => {
    expect(mode.read('any')).toBe('any');
    expect(mode.read('all')).toBe('all');
    expect(mode.read(undefined)).toBe('all');
    expect(mode.read('junk')).toBe('all');
    expect(mode.read(['any', 'all'])).toBe('any');
  });

  it('writes any into the address and all as nothing', () => {
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { categoryMode: 'any' })).toBe(
      '/admin/compendium?categoryMode=any',
    );
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { categoryMode: 'all' })).toBe(
      '/admin/compendium',
    );
  });

  it('gives the read a variable for any only', () => {
    expect(mode.variable).toBe('categoryMode');
    expect(mode.toVariable('any')).toBe('any');
    expect(mode.toVariable('all')).toBeUndefined();
  });
});
