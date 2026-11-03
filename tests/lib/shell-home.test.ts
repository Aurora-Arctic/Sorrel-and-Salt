import { describe, expect, it } from 'vitest';
import { covenHome } from '@/lib/shell-home';

// Where the Your Coven link goes: straight into the viewer's first coven, never via the /coven
// landing's redirect, and to the landing only for someone in none.

const COVENS = [
  { slug: 'fixture-coven', paused: null },
  { slug: 'testwort-circle', paused: null },
];

describe('covenHome', () => {
  it('is the first coven in the list it is given, which is the switcher’s order', () => {
    expect(covenHome(COVENS)).toBe('/coven/fixture-coven');
  });

  it('skips a coven whose access is paused for the next one the viewer can open', () => {
    expect(
      covenHome([
        { slug: 'fixture-coven', paused: { until: null } },
        { slug: 'testwort-circle', paused: null },
      ]),
    ).toBe('/coven/testwort-circle');
  });

  it('is the first coven when every one is paused, whose paused page says so and offers Leave', () => {
    expect(
      covenHome([
        { slug: 'fixture-coven', paused: { until: null } },
        { slug: 'testwort-circle', paused: { until: null } },
      ]),
    ).toBe('/coven/fixture-coven');
  });

  it('is the landing for someone in no coven, which offers the create page or explains the invitation', () => {
    expect(covenHome([])).toBe('/coven');
  });
});
