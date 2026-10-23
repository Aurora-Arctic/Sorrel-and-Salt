import { describe, expect, it } from 'vitest';
import { wikiKey } from '@/db/seed/compendium/audit';
import { fetchLookups } from '@/db/seed/compendium/wiki-lookup';

// The Wikipedia lookup behind `--resolve` (M14.11), with the API replaced by
// an invented reply: redirects are followed, disambiguation and missing pages
// are flagged, and a cached title is not asked for again.

describe('fetchLookups', () => {
  it('follows a redirect, flags a disambiguation page and a missing one, and skips the cached', async () => {
    const asked: string[] = [];
    const lookup = await fetchLookups(
      ['Proof_leaf', 'Fixtura', 'Nowhere', 'Cached'],
      new Map([[wikiKey('Cached'), { title: 'Cached' }]]),
      async (url) => {
        asked.push(new URL(url).searchParams.get('titles')!);
        return {
          query: {
            normalized: [{ from: 'Proof_leaf', to: 'Proof leaf' }],
            redirects: [{ from: 'Proof leaf', to: 'Fixtura testalis' }],
            pages: [
              { title: 'Fixtura testalis' },
              { title: 'Fixtura', pageprops: { disambiguation: '' } },
              { title: 'Nowhere', missing: true },
            ],
          },
        };
      },
    );
    expect(asked).toEqual(['Proof_leaf|Fixtura|Nowhere']);
    expect(lookup.get(wikiKey('Proof leaf'))).toEqual({ title: 'Fixtura testalis' });
    expect(lookup.get(wikiKey('Fixtura'))).toEqual({ title: 'Fixtura', disambiguation: true });
    expect(lookup.get(wikiKey('Nowhere'))).toEqual({ missing: true });
    expect(lookup.get(wikiKey('Cached'))).toEqual({ title: 'Cached' });
  });
});
