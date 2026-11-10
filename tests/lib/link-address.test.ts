import { describe, expect, it } from 'vitest';
import {
  LINK_SCHEMES,
  OPENABLE_ADDRESS,
  isOpenableAddress,
  linkAddressProblem,
  tidyLinkAddress,
} from '@/lib/link-address';

describe('tidyLinkAddress', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['  example.com/page  ', 'https://example.com/page'],
    ['http://example.com', 'https://example.com'],
    ['HTTP://example.com', 'https://example.com'],
    ['https://example.com', 'https://example.com'],
    ['mailto:ada@example.com', 'mailto:ada@example.com'],
    ['ada@example.com', 'mailto:ada@example.com'],
    ['  Ada@Example.com ', 'mailto:ada@example.com'],
    ['ada@', 'ada@'],
    ['https://ada@example.com', 'https://ada@example.com'],
    ['/coven/w/spells', '/coven/w/spells'],
    ['not an address', 'not an address'],
  ])('turns %j into %j', (typed, shown) => {
    expect(tidyLinkAddress(typed)).toBe(shown);
  });
});

describe('isOpenableAddress', () => {
  it.each(['https://example.com', 'mailto:a@b.co', '/help', '#top', '?page=2'])(
    'opens %j',
    (address) => expect(isOpenableAddress(address)).toBe(true),
  );

  it.each(['http://example.com', 'javascript:alert(1)', '//evil.test', 'example.com', 'tel:123'])(
    'does not open %j',
    (address) => expect(isOpenableAddress(address)).toBe(false),
  );
});

describe('linkAddressProblem', () => {
  it('accepts an openable address', () => {
    expect(linkAddressProblem('https://example.com/a')).toBeUndefined();
    expect(linkAddressProblem('mailto:ada@example.com')).toBeUndefined();
    expect(linkAddressProblem('/help')).toBeUndefined();
  });

  it.each(['', 'example', 'http://example.com', 'https://localhost', 'https://a b.com', '/a b'])(
    'names a problem with %j',
    (address) => expect(linkAddressProblem(address)).toEqual(expect.any(String)),
  );

  it('says a space is the problem when the address has one, even without a scheme', () => {
    expect(linkAddressProblem('exa mple.com')).toBe('That address has a space in it');
  });

  it('allows exactly the schemes the renderer opens', () => {
    expect(LINK_SCHEMES).toEqual(['https', 'mailto']);
  });
});

describe('OPENABLE_ADDRESS', () => {
  // The editor's link plugin accepts LINK_SCHEMES and the page opens OPENABLE_ADDRESS: the two agree, or a saved link is dead.
  it('opens an address in every scheme the link plugin accepts', () => {
    for (const scheme of LINK_SCHEMES)
      expect(OPENABLE_ADDRESS.test(`${scheme}:testwort`)).toBe(true);
  });

  it('opens no scheme the link plugin refuses', () => {
    const others = ['http', 'tel', 'ftp', 'javascript', 'data', 'file', 'sms'].filter(
      (scheme) => !LINK_SCHEMES.includes(scheme),
    );
    // Precondition: the list still has schemes outside LINK_SCHEMES to try.
    expect(others.length).toBeGreaterThan(0);
    for (const scheme of others) expect(OPENABLE_ADDRESS.test(`${scheme}:testwort`)).toBe(false);
  });
});
