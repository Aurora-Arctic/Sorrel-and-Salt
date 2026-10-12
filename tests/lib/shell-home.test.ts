import { describe, expect, it } from 'vitest';
import { covenHome, shellHome } from '@/lib/shell-home';

// Where the brand and the Your Coven link go: the /coven landing (M2.8).

describe('covenHome', () => {
  it("is the landing, which decides between the viewer's covens, the create page and the explanation", () => {
    expect(covenHome()).toBe('/coven');
  });
});

describe('shellHome', () => {
  it('is /admin for an admin', () => {
    expect(shellHome({ isAdmin: true })).toBe('/admin');
  });

  it('is the landing for anyone else, whatever covens they belong to', () => {
    expect(shellHome({ isAdmin: false })).toBe('/coven');
  });
});
