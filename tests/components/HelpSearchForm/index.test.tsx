import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HelpSearchForm from '@/components/HelpSearchForm';

// The help search box: a plain GET form to /help/search, so it searches with no script, and nothing is asked while
// a reader types (DESIGN.md §10, "Help and FAQ articles"; support.md, "Audiences, staff routes and search").

afterEach(() => {
  vi.unstubAllGlobals();
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
    expect(within(form()).getByRole('button')).toHaveAttribute('type', 'submit');
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
});
