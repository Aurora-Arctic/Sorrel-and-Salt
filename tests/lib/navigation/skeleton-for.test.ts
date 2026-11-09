import { describe, expect, it, vi } from 'vitest';

const Blank = () => null;
vi.mock('@/app/skeletons', () => ({
  skeletons: {
    '/keepers/documents/[key]': { host: 'admin', Skeleton: Blank },
    '/keepers/documents': { host: 'admin', Skeleton: Blank },
    '/keepers/users': { host: 'admin', Skeleton: Blank },
    '/curator/categories': { host: 'admin', Skeleton: Blank },
    '/curator/category-groups': { host: 'admin', Skeleton: Blank },
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
