import { describe, expect, it } from 'vitest';
import { linkTo } from '@/lib/help-pages';

describe('linkTo', () => {
  it('shows the marks of a summary as their text, as a list or a search result draws it', () => {
    const link = linkTo({
      kind: 'article',
      audience: 'public',
      slug: 'testwort',
      parentSlug: null,
      title: 'Testwort Guide',
      summary: 'For a [[Steward|steward]] and an [[Observer]].',
    });

    expect(link.summary).toBe('For a steward and an Observer.');
  });

  it('keeps a missing summary missing', () => {
    expect(
      linkTo({
        kind: 'article',
        audience: 'public',
        slug: 'testwort',
        parentSlug: null,
        title: 'Testwort Guide',
        summary: null,
      }).summary,
    ).toBeNull();
  });
});
