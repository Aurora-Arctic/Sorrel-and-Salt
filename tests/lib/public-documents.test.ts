import { describe, expect, it } from 'vitest';
import { PUBLIC_DOCUMENTS } from '@/lib/public-documents';

// The one list of the site's public documents that the sitemap and llms.txt both read.

describe('PUBLIC_DOCUMENTS', () => {
  it('names About and each public document by its page, in the sitemap’s order', () => {
    expect(PUBLIC_DOCUMENTS.map((document) => document.path)).toEqual([
      '/privacy',
      '/disclaimer',
      '/about',
      '/terms',
      '/code-of-ethics',
    ]);
  });

  it('gives each document a title to link it by', () => {
    expect(PUBLIC_DOCUMENTS.length).toBeGreaterThan(0);
    for (const document of PUBLIC_DOCUMENTS) expect(document.title.trim()).not.toBe('');
  });
});
