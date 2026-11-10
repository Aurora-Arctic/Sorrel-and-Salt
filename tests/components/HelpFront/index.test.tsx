import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';
import { HELP_LEDE } from '@/lib/help-pages';
import { Navigating } from '../../support/navigating';

// The address the help layout is showing, set by each test before it renders.
const here = vi.hoisted(() => ({ pathname: '/help', search: '' }));
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => here.pathname,
  useSearchParams: () => new URLSearchParams(here.search),
}));
vi.mock('@/app/skeletons', async () => ({
  skeletons: (await import('../../support/skeleton-registry')).testSkeletons,
}));

const { default: HelpFront } = await import('@/components/HelpFront');

// The public help pages' one header, mounted by their layout: the heading, the lede and the search box stay put while
// the page beneath it changes, and a search under way keeps its words (claude-docs/components/help-front.md).

let arrive = () => {};
const arrival = () =>
  new Promise<void>((resolve) => {
    arrive = resolve;
  });

function renderAt(pathname: string, search = '', staffHelp = false) {
  here.pathname = pathname;
  here.search = search;
  return render(
    <Navigating push={router.push} arrives={arrival()}>
      <HelpFront staffHelp={staffHelp}>
        <ul aria-label="Help page">
          <li>Testwort</li>
        </ul>
      </HelpFront>
    </Navigating>,
  );
}

const form = () => screen.getByRole('search');
const box = () => within(form()).getByRole('searchbox');
const page = () => screen.queryByRole('list', { name: 'Help page' });

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('HelpFront', () => {
  it('draws the Help heading, the lede and the search box, in that order, above the page', () => {
    renderAt('/help');

    const heading = screen.getByRole('heading', { level: 1, name: 'Help' });
    const lede = screen.getByText(HELP_LEDE);
    const following = (a: Node, b: Node) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(following(heading, lede)).toBeTruthy();
    expect(following(lede, form())).toBeTruthy();
    expect(following(form(), page()!)).toBeTruthy();
    expect(screen.getAllByRole('search')).toHaveLength(1);
  });

  it.each([
    [true, ['/help/staff']],
    [false, []],
  ])('offers Staff Help only when told to (%s)', (staffHelp, links) => {
    renderAt('/help', '', staffHelp);

    expect(
      screen.queryAllByRole('link', { name: 'Staff Help' }).map((a) => a.getAttribute('href')),
    ).toEqual(links);
  });

  it('holds the words of the search page it stands over', () => {
    renderAt('/help/search', 'q=+stock+levels');

    expect(box()).toHaveValue('stock levels');
  });

  it.each(['/help', '/help/testwort-guide'])(
    'starts the box empty on %s, whatever the address asks',
    (pathname) => {
      renderAt(pathname, 'q=stock');

      expect(box()).toHaveValue('');
    },
  );

  it('keeps the header and the words typed while a new search is on its way, taking only the page away', async () => {
    renderAt('/help/search', 'q=stock');
    fireEvent.change(box(), { target: { value: 'grimoire' } });

    await act(async () => {
      fireEvent.submit(form());
    });

    // Why the page went: the search is on its way.
    expect(router.push).toHaveBeenCalledWith('/help/search?q=grimoire');
    expect(page()).toBeNull();
    expect(screen.getByRole('region', { name: 'Help search skeleton' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1, name: 'Help' })).toHaveLength(1);
    expect(screen.getAllByRole('search')).toHaveLength(1);
    expect(box()).toHaveValue('grimoire');
    expect(within(form()).getByRole('button', { name: 'Search' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // The public layout owns the page's `main`; the help body's skeleton adds none.
    expect(screen.queryByRole('main')).toBeNull();
  });
});
