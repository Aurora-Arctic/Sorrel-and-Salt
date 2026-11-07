import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// A skeleton draws the page's own heading, because the hosts no longer add a hidden one while a
// page is on its way: a wait must leave exactly one level-one heading on screen.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {}, refresh: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

describe('the registered skeletons', () => {
  it('each draw exactly one level-one heading', async () => {
    const { skeletons } = await import('@/app/skeletons');
    const patterns = Object.keys(skeletons);
    expect(patterns.length).toBeGreaterThan(30);
    const wrong = patterns
      .map((pattern) => {
        const { Skeleton } = skeletons[pattern as keyof typeof skeletons];
        const count = (renderToStaticMarkup(<Skeleton />).match(/<h1[\s>]/g) ?? []).length;
        return { pattern, count };
      })
      .filter(({ count }) => count !== 1)
      .map(({ pattern, count }) => `${pattern}: ${count}`);
    expect(wrong).toEqual([]);
  });
});
