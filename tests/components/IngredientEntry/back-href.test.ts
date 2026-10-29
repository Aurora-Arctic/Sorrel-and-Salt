import { describe, expect, it } from 'vitest';
import { listReturnHref } from '@/components/IngredientEntry/back-href';

// MB.271: the entry's way back is the page before it only when that page is this entry's list.
const ORIGIN = 'https://sorrel.example';
const COMPENDIUM = '/compendium';
const COVEN_LIST = '/coven/fixture-coven/ingredients';

describe('listReturnHref', () => {
  it("returns the list's path and query when the page before is the entry's own list", () => {
    expect(
      listReturnHref(
        `${ORIGIN}/compendium?query=Testwort&category=resin&after=abc`,
        ORIGIN,
        COMPENDIUM,
      ),
    ).toBe('/compendium?query=Testwort&category=resin&after=abc');
    expect(
      listReturnHref(`${ORIGIN}${COVEN_LIST}?query=Testwort&after=xyz`, ORIGIN, COVEN_LIST),
    ).toBe(`${COVEN_LIST}?query=Testwort&after=xyz`);
  });

  it('returns the bare list itself when the page before was the unfiltered list', () => {
    expect(listReturnHref(`${ORIGIN}/compendium`, ORIGIN, COMPENDIUM)).toBe('/compendium');
  });

  it('drops a fragment, which names no part of the list', () => {
    expect(listReturnHref(`${ORIGIN}/compendium?query=Testwort#top`, ORIGIN, COMPENDIUM)).toBe(
      '/compendium?query=Testwort',
    );
  });

  it('refuses a page before it on another origin, even at the same path', () => {
    expect(
      listReturnHref('https://elsewhere.example/compendium?query=Testwort', ORIGIN, COMPENDIUM),
    ).toBeUndefined();
    expect(listReturnHref('http://sorrel.example/compendium', ORIGIN, COMPENDIUM)).toBeUndefined();
  });

  it('refuses another route on this origin', () => {
    for (const path of [
      '/',
      '/admin/compendium?query=Testwort',
      '/compendium/ingredients/testwort',
      '/compendiumx',
      '/compendium/',
      '/coven/fixture-coven/ingredients/123',
    ]) {
      expect(listReturnHref(`${ORIGIN}${path}`, ORIGIN, COMPENDIUM), path).toBeUndefined();
    }
    expect(listReturnHref(`${ORIGIN}/compendium`, ORIGIN, COVEN_LIST)).toBeUndefined();
  });

  it("refuses another coven's Ingredients page", () => {
    expect(
      listReturnHref(`${ORIGIN}/coven/other-coven/ingredients?query=Testwort`, ORIGIN, COVEN_LIST),
    ).toBeUndefined();
  });

  it('refuses a missing or unreadable page before it', () => {
    expect(listReturnHref(undefined, ORIGIN, COMPENDIUM)).toBeUndefined();
    expect(listReturnHref(null, ORIGIN, COMPENDIUM)).toBeUndefined();
    expect(listReturnHref('', ORIGIN, COMPENDIUM)).toBeUndefined();
    expect(listReturnHref('not a url', ORIGIN, COMPENDIUM)).toBeUndefined();
  });

  it("takes any of several list paths as the list, the grimoire's two tabs (M13.21), and nothing beneath them", () => {
    const GRIMOIRE = ['/coven/fixture-coven/grimoire', '/coven/fixture-coven/grimoire/drafts'];
    expect(
      listReturnHref(`${ORIGIN}/coven/fixture-coven/grimoire/drafts?query=a`, ORIGIN, GRIMOIRE),
    ).toBe('/coven/fixture-coven/grimoire/drafts?query=a');
    expect(listReturnHref(`${ORIGIN}/coven/fixture-coven/grimoire`, ORIGIN, GRIMOIRE)).toBe(
      '/coven/fixture-coven/grimoire',
    );
    expect(
      listReturnHref(`${ORIGIN}/coven/fixture-coven/grimoire/some-spell`, ORIGIN, GRIMOIRE),
    ).toBeUndefined();
  });
});
