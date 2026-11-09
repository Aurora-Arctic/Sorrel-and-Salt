import { describe, expect, it } from 'vitest';
import { byAudience, placeInAudience } from '@/lib/help-audience';

// The keepers' Guides bar lists the guides by audience, Public, then Staff, then Keeper, each audience once.

describe('byAudience', () => {
  it('lists Public, then Staff, then Keeper guides, each audience’s guides in the order given', () => {
    const guides = [
      { id: 'k1', audience: 'keeper' as const },
      { id: 'p1', audience: 'public' as const },
      { id: 's1', audience: 'staff' as const },
      { id: 'p2', audience: 'public' as const },
      { id: 'k2', audience: 'keeper' as const },
    ];

    expect(byAudience(guides).map((guide) => guide.id)).toEqual(['p1', 'p2', 's1', 'k1', 'k2']);
    expect(guides[0].id).toBe('k1');
  });
});

// The guide pane's "Position # of #" counts within the guide's own audience, as Reorder Mode numbers its rows.
describe('placeInAudience', () => {
  it('places each guide among its own audience’s guides and counts that audience alone', () => {
    const guides = byAudience([
      { id: 'p1', audience: 'public' as const },
      { id: 'p2', audience: 'public' as const },
      { id: 's1', audience: 'staff' as const },
    ]);

    const places = placeInAudience(guides);

    expect(places.get('p1')).toEqual({ place: 1, of: 2 });
    expect(places.get('p2')).toEqual({ place: 2, of: 2 });
    expect(places.get('s1')).toEqual({ place: 1, of: 1 });
  });
});
