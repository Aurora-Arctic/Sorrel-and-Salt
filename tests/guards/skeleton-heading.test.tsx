import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// A skeleton draws the page's own heading, because the hosts no longer add a hidden one while a
// page is on its way: a wait must leave exactly one level-one heading on screen. On the help index and the search page the
// heading is the help header's Help, which stays up over their skeletons; on every other public help page it is the
// page's own title, with Help above it a label.
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
        // A help skeleton is counted standing inside the help header its page's address gives.
        const Drawn = host === 'help' ? framed(host, Skeleton, '', pattern) : Skeleton;
        return { pattern, count: h1s(Drawn) };
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
