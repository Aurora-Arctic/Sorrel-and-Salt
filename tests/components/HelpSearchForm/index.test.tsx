import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import HelpSearchForm from '@/components/HelpSearchForm';
import { skeletonFor } from '@/lib/navigation/skeleton-for';
import { Navigating } from '../../support/navigating';
import { router } from '../../support/next-navigation';

const at = vi.hoisted(() => ({ pathname: '/help' }));
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => at.pathname,
}));

// The help search box: a plain GET form to /help/search, so it searches with no script, and nothing is asked while
// a reader types (DESIGN.md §10, "Help and FAQ articles"; support.md, "Audiences, staff routes and search").

afterEach(() => {
  vi.unstubAllGlobals();
  router.push.mockReset();
  at.pathname = '/help';
});

const form = () => screen.getByRole('search');
const box = () => within(form()).getByRole('searchbox');

describe('HelpSearchForm', () => {
  it('submits the words as q to /help/search by GET', () => {
    render(<HelpSearchForm />);

    const element = form();
    const search = element.tagName === 'FORM' ? element : element.querySelector('form');
    expect(search).not.toBeNull();
    expect(search).toHaveAttribute('action', '/help/search');
    expect((search!.getAttribute('method') ?? 'get').toLowerCase()).toBe('get');
    expect(box()).toHaveAttribute('name', 'q');
  });

  it('holds the words already searched for', () => {
    render(<HelpSearchForm query="stock levels" />);

    expect(box()).toHaveValue('stock levels');
  });

  it('starts empty with no query', () => {
    render(<HelpSearchForm />);

    expect(box()).toHaveValue('');
  });

  it('offers no suggestions as the reader types, and asks the server nothing', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<HelpSearchForm />);

    fireEvent.change(box(), { target: { value: 'coven' } });

    // Precondition: the typing landed in the box.
    expect(box()).toHaveValue('coven');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByRole('option')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('draws no text button, only the magnifier as the one submit', () => {
    render(<HelpSearchForm />);

    const buttons = within(form()).getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('type', 'submit');
    expect(buttons[0]).toHaveAccessibleName('Search');
    expect(buttons[0]).toHaveTextContent(/^Search$/);
  });

  it.each(['', '   '])('does not submit on Enter with %j in the box', (value) => {
    render(<HelpSearchForm />);
    fireEvent.change(box(), { target: { value } });

    // fireEvent returns false when the default action (the navigation) was prevented.
    expect(fireEvent.submit(form())).toBe(false);
  });

  it("searches through the site's own navigation once the box holds words, so the results page's wait shows", async () => {
    render(
      <Navigating push={router.push}>
        <HelpSearchForm />
      </Navigating>,
    );
    const submit = within(form()).getByRole('button', { name: 'Search' });
    expect(submit).not.toHaveAttribute('aria-busy', 'true');
    fireEvent.change(box(), { target: { value: '  stock levels ' } });

    // The browser's own page load is stopped: it would show nothing until the results arrived.
    let loaded = true;
    await act(async () => {
      loaded = fireEvent.submit(form());
    });
    expect(loaded).toBe(false);

    expect(router.push).toHaveBeenCalledWith('/help/search?q=stock+levels');
    expect(submit).toHaveAttribute('aria-busy', 'true');
  });

  // Regression: the box took the words searched when their results arrived, losing what was typed meanwhile.
  it('keeps the words typed after a search is sent when that search arrives, open to typing meanwhile', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Navigating push={router.push}>
        <HelpSearchForm />
      </Navigating>,
    );
    fireEvent.change(box(), { target: { value: 'rose' } });
    act(() => box().focus());
    await act(async () => {
      fireEvent.submit(form());
    });
    expect(router.push).toHaveBeenCalledWith('/help/search?q=rose');
    // Precondition: the search is still on its way.
    expect(within(form()).getByRole('button', { name: 'Search' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    // The public header stays up across the move, so its box keeps taking typing.
    expect(box()).not.toHaveAttribute('aria-disabled', 'true');
    await user.type(box(), 'mary', {
      skipClick: true,
      initialSelectionStart: 'rose'.length,
      initialSelectionEnd: 'rose'.length,
    });
    expect(box()).toHaveValue('rosemary');
    await act(async () => {
      rerender(
        <Navigating push={router.push}>
          <HelpSearchForm query="rose" />
        </Navigating>,
      );
    });

    expect(box()).toHaveValue('rosemary');
  });

  // A staff help page is left for the public layout, whose placeholder draws a box of its own over this one.
  it.each(['/help/staff', '/help/staff/testwort-rota'])(
    'shuts the box on %s once a search is sent, its words kept and typing refused, the focus staying',
    async (pathname) => {
      at.pathname = pathname;
      const user = userEvent.setup();
      render(
        <Navigating push={router.push}>
          <HelpSearchForm />
        </Navigating>,
      );
      // Precondition: before a search the box is open, and takes typing.
      expect(box()).not.toHaveAttribute('aria-disabled', 'true');
      await user.type(box(), 'rose');
      expect(box()).toHaveValue('rose');

      await user.keyboard('{Enter}');
      expect(router.push).toHaveBeenCalledWith('/help/search?q=rose');

      expect(box()).toHaveAttribute('aria-disabled', 'true');
      expect(box()).toHaveFocus();
      await user.type(box(), 'mary', { skipClick: true });
      expect(box()).toHaveValue('rose');
    },
  );

  /**
   * The words searched from a staff help page, the search on its way, and the placeholder `skeletonFor` returns for
   * that move drawn beside the old page's box, as the shell draws it; returns the placeholder's box.
   */
  const placeholderBoxAfter = async (words: string, href: string) => {
    at.pathname = '/help/staff';
    const Placeholder = skeletonFor('main', href, '/help/staff');
    // Precondition: the move draws the public help header afresh, the old page's box held under it.
    expect(Placeholder).not.toBeNull();
    const page = (sent: boolean) => (
      <Navigating push={router.push}>
        <HelpSearchForm />
        {sent && Placeholder && (
          <section aria-label="Placeholder">
            <Placeholder />
          </section>
        )}
      </Navigating>
    );
    const { rerender } = render(page(false));
    fireEvent.change(box(), { target: { value: words } });
    await act(async () => {
      fireEvent.submit(form());
    });
    expect(router.push).toHaveBeenCalledWith(href);
    await act(async () => {
      rerender(page(true));
    });
    return within(screen.getByRole('region', { name: 'Placeholder' })).getByRole('searchbox', {
      name: 'Search Help',
    });
  };

  it('shuts the box the placeholder draws for a search sent from a staff help page', async () => {
    expect(await placeholderBoxAfter('rose', '/help/search?q=rose')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it.each([
    ['rose', '/help/search?q=rose', 'rose'],
    ['rose hip', '/help/search?q=rose+hip', 'rose hip'],
  ])(
    'shows the words of the search on its way, %j, in the box the placeholder draws',
    async (words, href, shown) => {
      expect(await placeholderBoxAfter(words, href)).toHaveValue(shown);
    },
  );

  it('leaves the placeholder’s box empty for a move to the search page with no words', () => {
    at.pathname = '/help/staff';
    const Placeholder = skeletonFor('main', '/help/search', '/help/staff');
    expect(Placeholder).not.toBeNull();
    render(<Navigating push={router.push}>{Placeholder && <Placeholder />}</Navigating>);

    expect(box()).toHaveValue('');
  });
  it('sends nothing through the navigation for a blank box on the help index', () => {
    render(
      <Navigating push={router.push}>
        <HelpSearchForm />
      </Navigating>,
    );
    fireEvent.change(box(), { target: { value: '   ' } });

    fireEvent.submit(form());

    expect(router.push).not.toHaveBeenCalled();
  });

  it.each(['/help/search', '/help/testwort-guide'])(
    'goes back to the help index for a blank box on %s',
    async (pathname) => {
      at.pathname = pathname;
      render(
        <Navigating push={router.push}>
          <HelpSearchForm query="stock" />
        </Navigating>,
      );
      fireEvent.change(box(), { target: { value: '   ' } });

      let loaded = true;
      await act(async () => {
        loaded = fireEvent.submit(form());
      });

      expect(loaded).toBe(false);
      expect(router.push).toHaveBeenCalledWith('/help');
      expect(router.push).toHaveBeenCalledTimes(1);
    },
  );

  // Regression: a blank search on a staff help page took the keeper to the public help index.
  describe('a blank search on a staff help page', () => {
    const blankEnter = async (pathname: string, typed: string) => {
      at.pathname = pathname;
      const user = userEvent.setup();
      render(
        <Navigating push={router.push}>
          <HelpSearchForm />
        </Navigating>,
      );
      await user.click(box());
      if (typed) await user.type(box(), typed, { skipClick: true });
      await user.keyboard('{Enter}');
    };

    it.each(['', '   '])('stays on the staff help index with %j in the box', async (typed) => {
      await blankEnter('/help/staff', typed);

      expect(router.push).not.toHaveBeenCalled();
    });

    it.each(['', '   '])(
      'goes back to the staff help index, not the public one, from a staff article with %j in the box',
      async (typed) => {
        await blankEnter('/help/staff/testwort-rota', typed);

        expect(router.push.mock.calls).toEqual([['/help/staff']]);
        // The move stays inside the staff layout, so the box stays open while it loads.
        expect(box()).not.toHaveAttribute('aria-disabled', 'true');
      },
    );
  });
});
