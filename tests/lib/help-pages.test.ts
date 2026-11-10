import { describe, expect, it } from 'vitest';
import { guideSteps, linkTo } from '@/lib/help-pages';

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

describe('guideSteps', () => {
  const guide = { title: 'Testwort Guide', summary: null, href: '/help/testwort' };
  const pages = [
    { title: 'Sow Testwort', summary: 'First.', href: '/help/testwort/sow' },
    { title: 'Tend Testwort', summary: null, href: '/help/testwort/tend' },
    { title: 'Reap Testwort', summary: null, href: '/help/testwort/reap' },
  ];

  it('gives the guide itself no previous page, and its first sub page as the next', () => {
    expect(guideSteps(guide, pages, guide.href)).toEqual({
      next: { title: 'Sow Testwort', href: '/help/testwort/sow' },
    });
  });

  it('gives the first sub page the guide as its previous page', () => {
    expect(guideSteps(guide, pages, pages[0].href)).toEqual({
      previous: { title: 'Testwort Guide', href: '/help/testwort' },
      next: { title: 'Tend Testwort', href: '/help/testwort/tend' },
    });
  });

  it('gives the last sub page no next page', () => {
    expect(guideSteps(guide, pages, pages[2].href)).toEqual({
      previous: { title: 'Tend Testwort', href: '/help/testwort/tend' },
    });
  });

  it('gives a guide with no sub pages neither link', () => {
    expect(guideSteps(guide, [], guide.href)).toEqual({});
  });

  it('steps over a sub page the reader cannot reach, since the sequence is the children it was given', () => {
    const reached = [pages[0], pages[2]];
    expect(guideSteps(guide, reached, pages[0].href).next).toEqual({
      title: 'Reap Testwort',
      href: '/help/testwort/reap',
    });
  });

  it('gives a page outside the guide neither link', () => {
    expect(guideSteps(guide, pages, '/help/elsewhere')).toEqual({});
  });
});
