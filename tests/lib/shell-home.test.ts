import { describe, expect, it } from 'vitest';
import { covenHome, shellHome } from '@/lib/shell-home';

// Where the brand and the Your Coven link go, until M2.8 builds `/coven`.

const COVENS = [{ slug: 'fixture-coven' }, { slug: 'testwort-circle' }];

describe('covenHome', () => {
  it('is the first coven the viewer belongs to', () => {
    expect(covenHome(COVENS, false)).toBe('/coven/fixture-coven');
    expect(covenHome(COVENS, true)).toBe('/coven/fixture-coven');
  });

  it('is the create page for someone with no coven who may make one', () => {
    expect(covenHome([], true)).toBe('/coven/new');
  });

  it('is the account page for someone with no coven who may not', () => {
    expect(covenHome([], false)).toBe('/account');
  });
});

describe('shellHome', () => {
  it('is /admin for an admin, whatever covens they belong to', () => {
    expect(shellHome({ isAdmin: true, canCreate: true }, COVENS)).toBe('/admin');
    expect(shellHome({ isAdmin: true, canCreate: false }, [])).toBe('/admin');
  });

  it('is the coven home for anyone else', () => {
    expect(shellHome({ isAdmin: false, canCreate: false }, COVENS)).toBe('/coven/fixture-coven');
    expect(shellHome({ isAdmin: false, canCreate: true }, [])).toBe('/coven/new');
    expect(shellHome({ isAdmin: false, canCreate: false }, [])).toBe('/account');
  });
});
