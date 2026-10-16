import { describe, expect, it } from 'vitest';
import { covenHome, shellHome } from '@/lib/shell-home';

// Where the brand and the Your Coven link go: straight into the viewer's first
// coven, never via the /coven landing's redirect (MB.257), and to the landing
// (M2.8) only for someone in none.

const COVENS = [{ slug: 'fixture-coven' }, { slug: 'testwort-circle' }];

describe('covenHome', () => {
  it('is the first coven in the list it is given, which is the switcher’s order', () => {
    expect(covenHome(COVENS)).toBe('/coven/fixture-coven');
  });

  it('is the landing for someone in no coven, which offers the create page or explains the invitation', () => {
    expect(covenHome([])).toBe('/coven');
  });
});

describe('shellHome', () => {
  it('is /admin for a curator or an admin, even one with a coven', () => {
    expect(shellHome({ canCurate: true }, COVENS)).toBe('/admin');
  });

  it('is the viewer’s first coven for anyone else, or the landing when they have none', () => {
    expect(shellHome({ canCurate: false }, COVENS)).toBe('/coven/fixture-coven');
    expect(shellHome({ canCurate: false }, [])).toBe('/coven');
  });
});
