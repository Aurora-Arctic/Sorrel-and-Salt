import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HelpSearchForm from '@/components/HelpSearchForm';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The help search box: a plain GET form to /help/search, so it searches with no script, and nothing is asked while
// a reader types (DESIGN.md §10, "Help and FAQ articles"; support.md, "Audiences, staff routes and search").

afterEach(() => {
  vi.unstubAllGlobals();
  router.push.mockReset();
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

  it('sends nothing through the navigation for a blank box', () => {
    render(
      <Navigating push={router.push}>
        <HelpSearchForm />
      </Navigating>,
    );
    fireEvent.change(box(), { target: { value: '   ' } });

    fireEvent.submit(form());

    expect(router.push).not.toHaveBeenCalled();
  });
});
