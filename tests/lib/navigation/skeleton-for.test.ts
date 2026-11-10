import { describe, expect, it, vi } from 'vitest';

const Blank = () => null;
vi.mock('@/app/skeletons', () => ({
  skeletons: {
    '/keepers/documents/[key]': { host: 'admin', Skeleton: Blank },
    '/keepers/documents': { host: 'admin', Skeleton: Blank },
    '/keepers/users': { host: 'admin', Skeleton: Blank },
    '/curator/categories': { host: 'admin', Skeleton: Blank },
    '/curator/category-groups': { host: 'admin', Skeleton: Blank },
    '/help': { host: 'help', Skeleton: Blank },
    '/help/search': { host: 'help', Skeleton: Blank },
    '/help/[slug]': { host: 'help', Skeleton: Blank },
    '/help/staff': { host: 'main', Skeleton: Blank },
  },
}));

const { skeletonFor } = await import('@/lib/navigation/skeleton-for');

describe('the admin section body’s skeleton', () => {
  it('stands over a move to another admin page', () => {
    expect(skeletonFor('admin', '/keepers/users', '/keepers/documents/privacy')).toBe(Blank);
    expect(skeletonFor('admin', '/keepers/documents/about', '/keepers/users')).toBe(Blank);
  });

  it.each([
    ['/keepers/documents/privacy', '/keepers/documents/about'],
    ['/keepers/documents/terms', '/keepers/documents'],
    ['/curator/categories', '/curator/category-groups?x=1'],
  ])('leaves a move between two tabs of one page to the tab row, %s to %s', (from, to) => {
    expect(skeletonFor('admin', to, from)).toBeNull();
    expect(skeletonFor('main', to, from)).toBeNull();
  });
});

describe('the help body’s skeleton', () => {
  it.each([
    ['/help', '/help/search?q=stock'],
    ['/help/search', '/help/testwort-guide'],
    ['/help/testwort-guide', '/help'],
  ])(
    'stands over a move between two public help pages, %s to %s, under the header that stays',
    (from, to) => {
      expect(skeletonFor('help', to, from)).toBe(Blank);
      expect(skeletonFor('main', to, from)).toBeNull();
    },
  );

  it('stands over a new query on the search page, which another same-page move does not draw', () => {
    expect(skeletonFor('help', '/help/search?q=salt', '/help/search')).toBe(Blank);
    expect(skeletonFor('help', '/help?x=1', '/help')).toBeNull();
  });

  it('leaves a move in from the staff pages to the shell, framed with the help header still to come', () => {
    const shown = skeletonFor('main', '/help', '/help/staff');
    expect(shown).not.toBeNull();
    expect(shown).not.toBe(Blank);
    expect(skeletonFor('help', '/help', '/help/staff')).toBeNull();
  });

  it('draws nothing for a move out to the staff pages, whose layout the help body is not', () => {
    expect(skeletonFor('help', '/help/staff', '/help')).toBeNull();
    expect(skeletonFor('main', '/help/staff', '/help')).toBe(Blank);
  });
});
