import { describe, expect, it } from 'vitest';
import { siteLinkTarget } from '@/components/AppShell/site-target';

// A main-region wait is drawn in the destination's own frame (M12.33).
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
