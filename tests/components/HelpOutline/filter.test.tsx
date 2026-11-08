import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HelpOutlineFilterRow from '@/components/HelpOutline/filter';
import { keepersHelpHref } from '@/components/HelpOutline/href';
import type { HelpOutlineFilter } from '@/components/HelpOutline/types';
import { ListNavigationContext } from '@/components/ListFrame';

// The keeper help list's filter row: Kind, Audience and Shown are each a choice chip whose pick applies at once,
// with the same address parameters the list reads (claude-docs/components/help-outline.md).

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/help',
  useSearchParams: () => new URLSearchParams(),
}));

const BARE: HelpOutlineFilter = { query: '', kind: '', audience: '', shown: 'shown' };

function row(filter: HelpOutlineFilter): ReturnType<typeof vi.fn> {
  const go = vi.fn();
  const ui: ReactElement = (
    <ListNavigationContext.Provider value={{ pending: false, searching: false, go }}>
      <HelpOutlineFilterRow filter={filter} />
    </ListNavigationContext.Provider>
  );
  render(ui);
  return go;
}

const radios = (legend: string) =>
  within(screen.getByRole('group', { name: new RegExp(`^${legend}`) }))
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('aria-label') ?? radio.closest('label')?.textContent);

const radio = (legend: string, name: string) =>
  within(screen.getByRole('group', { name: new RegExp(`^${legend}`) })).getByRole('radio', {
    name,
  });

describe('HelpOutlineFilterRow', () => {
  it('offers Audience as a chip of All and each audience, resting on All', () => {
    row(BARE);

    expect(radios('Audience')).toEqual(['All', 'Public', 'Staff', 'Keeper']);
    expect(radio('Audience', 'All')).toBeChecked();
  });

  it('applies an audience as its address parameter, keeping the rest of the filter', () => {
    const go = row({ ...BARE, kind: 'article' });

    fireEvent.click(radio('Audience', 'Staff'));

    expect(go).toHaveBeenCalledWith(
      keepersHelpHref({ ...BARE, kind: 'article', audience: 'staff' }),
      'soft',
    );
    expect(String(go.mock.calls[0][0])).toContain('audience=staff');
  });

  it('offers Shown as a chip of Shown, Hidden and All, resting on Shown with a bare address', () => {
    const go = row({ ...BARE, shown: 'hidden' });

    expect(radios('Shown')).toEqual(['Shown', 'Hidden', 'All']);
    expect(radio('Shown', 'Hidden')).toBeChecked();

    fireEvent.click(radio('Shown', 'Shown'));

    expect(go).toHaveBeenCalledWith(keepersHelpHref(BARE), 'soft');
    expect(String(go.mock.calls[0][0])).not.toContain('shown=');
  });

  it('applies Hidden and All as the shown parameter', () => {
    const go = row(BARE);

    fireEvent.click(radio('Shown', 'All'));

    expect(go).toHaveBeenCalledWith(keepersHelpHref({ ...BARE, shown: 'all' }), 'soft');
    expect(String(go.mock.calls[0][0])).toContain('shown=all');
  });
});
