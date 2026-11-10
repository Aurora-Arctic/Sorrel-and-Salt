import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// A skeleton draws the page's own heading, because the hosts no longer add a hidden one while a
// page is on its way: a wait must leave exactly one level-one heading on screen. A public help page's
// heading is the help header's, which stays up over its skeleton, so that skeleton draws it only framed.
vi.mock('next/navigation', async () => ({
  ...(await import('../support/next-navigation')),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

describe('the registered skeletons', () => {
  it('each draw exactly one level-one heading', async () => {
    const { skeletons } = await import('@/app/skeletons');
    const { framed } = await import('@/components/SkeletonFrame');
    const h1s = (Drawn: React.ComponentType) =>
      (renderToStaticMarkup(<Drawn />).match(/<h1[\s>]/g) ?? []).length;
    const patterns = Object.keys(skeletons);
    expect(patterns.length).toBeGreaterThan(30);
    const wrong = patterns
      .map((pattern) => {
        const { host, Skeleton } = skeletons[pattern as keyof typeof skeletons];
        if (host !== 'help') return { pattern, count: h1s(Skeleton) };
        // Under the standing header the skeleton adds none; framed, it has the header's one.
        const own = h1s(Skeleton);
        return { pattern, count: own === 0 ? h1s(framed(host, Skeleton)) : own + 1 };
      })
      .filter(({ count }) => count !== 1)
      .map(({ pattern, count }) => `${pattern}: ${count}`);
    // Precondition: the help pages are among those counted.
    expect(
      patterns.filter((p) => skeletons[p as keyof typeof skeletons].host === 'help'),
    ).toHaveLength(5);
    expect(wrong).toEqual([]);
  });
});
