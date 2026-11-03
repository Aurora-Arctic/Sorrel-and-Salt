import { describe, expect, it, vi } from 'vitest';
import {
  DOCUMENTS_REVALIDATE_SECONDS,
  DOCUMENTS_TAG,
  cachedDocumentRead,
} from '@/lib/documents-cache';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { clearDataCache, declared } from '../support/next-data-cache';

// The published documents' data cache: the same for every viewer, so CLAUDE.md rule 6 allows it, and under a tag of its own so a
// publish never empties the compendium's (claude-docs/design-decisions/m15.59-document-editor-scope.md, "Caching"). Against a data
// cache that holds as Next's does (tests/support/next-data-cache.ts).
vi.mock('next/cache', () => import('../support/next-data-cache'));

describe('cachedDocumentRead', () => {
  it('declares the read under the documents tag alone, and gives a hit back as the miss gave it, dates as dates', async () => {
    clearDataCache();
    const version = { number: 1, publishedAt: new Date('2026-03-04T00:00:00Z') };
    const cached = cachedDocumentRead('fixture-document', async () => version);

    expect(DOCUMENTS_TAG).toBe('documents');
    expect(DOCUMENTS_TAG).not.toBe(COMPENDIUM_TAG);
    expect(declared[declared.length - 1]).toEqual({
      keyParts: ['fixture-document'],
      tags: [DOCUMENTS_TAG],
      revalidate: DOCUMENTS_REVALIDATE_SECONDS,
    });

    const miss = await cached();
    const hit = await cached();

    expect(miss).toEqual(version);
    expect(hit).toEqual(version);
    expect(hit.publishedAt).toBeInstanceOf(Date);
  });
});
