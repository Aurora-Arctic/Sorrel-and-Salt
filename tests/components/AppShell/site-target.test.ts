import { describe, expect, it } from 'vitest';
import { ingredientLinkTarget, siteLinkTarget } from '@/components/AppShell/site-target';

// A main-region wait is drawn in the destination's own frame.
describe('siteLinkTarget', () => {
  it('draws the Compendium as wide cards under a heading and a filter, with no Add', () => {
    const target = siteLinkTarget('/compendium', '/compendium');
    expect(target).toMatchObject({
      region: 'main',
      shape: 'cards',
      frame: 'wide',
      title: true,
      filter: true,
    });
    expect(target.action).toBeFalsy();
  });

  it('draws the coven index in the forms\x27 column', () => {
    expect(siteLinkTarget('/coven', '/coven')).toMatchObject({ shape: 'page', frame: 'narrow' });
  });

  it('draws a lone coven\x27s home as a page with its contents menu', () => {
    expect(siteLinkTarget('/coven', '/coven/fixture-coven')).toMatchObject({
      shape: 'page',
      frame: 'with-nav',
      head: 'eyebrow',
    });
  });

  it('draws the admin index as wide sections of links', () => {
    expect(siteLinkTarget('/admin', '/admin')).toMatchObject({ shape: 'contents', frame: 'wide' });
  });

  it('waits in the main region for every link', () => {
    for (const base of ['/compendium', '/coven', '/admin', '/other']) {
      expect(siteLinkTarget(base, base).region).toBe('main');
    }
  });
});

// A link into an ingredient's page draws that page's frame: the
// compendium entry is a wide page with its jump menu; a coven's entry sits
// under the coven's context row, so it is the coven region's.
describe('ingredientLinkTarget', () => {
  it('draws a compendium entry as a wide page with its jump menu', () => {
    expect(ingredientLinkTarget('/compendium/ingredients/fixture-testwort')).toEqual({
      region: 'main',
      shape: 'page',
      frame: 'entry',
      head: 'eyebrow',
    });
  });

  it('draws a coven\x27s entry in the coven region, as a page with its jump menu', () => {
    expect(ingredientLinkTarget('/coven/fixture-coven/ingredients/some-id')).toEqual({
      region: 'coven',
      shape: 'page',
      frame: 'entry',
      head: 'eyebrow',
    });
  });

  it('draws a coven\x27s entry in the main region when the press starts outside any coven', () => {
    expect(ingredientLinkTarget('/coven/fixture-coven/ingredients/some-id', false)).toMatchObject({
      region: 'main',
      shape: 'page',
      frame: 'entry',
      head: 'eyebrow',
    });
  });

  it('draws the Compendium search a See All opens as the Compendium list, query ignored', () => {
    expect(ingredientLinkTarget('/compendium?query=testwort')).toEqual(
      siteLinkTarget('/compendium'),
    );
  });

  it('names no target for an address that is not an ingredient page or list', () => {
    expect(ingredientLinkTarget('/account')).toBeUndefined();
  });
});
