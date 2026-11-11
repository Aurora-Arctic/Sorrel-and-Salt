import type { Route } from 'next';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';
import { Navigating } from '../../support/navigating';

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => '/here',
}));

const { SortSelect } = await import('@/components/DataTable/sort-select');

// The phone's sort: a choice is a navigation to the list in that order, a server render away,
// so the select is busy until the sorted list arrives.

const BY_NAME = '/curator/compendium?sort=name' as Route;
const BY_NAME_DESC = '/curator/compendium?sort=name&order=desc' as Route;
const CHOICES = [
  { label: 'Name, A to Z', href: BY_NAME },
  { label: 'Name, Z to A', href: BY_NAME_DESC },
];

let arrive = () => {};

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('SortSelect', () => {
  it('is busy from a choice until the sorted list arrives', async () => {
    const arrives = new Promise<void>((resolve) => (arrive = resolve));
    render(
      <Navigating push={router.push} arrives={arrives}>
        <SortSelect choices={CHOICES} current={BY_NAME} />
      </Navigating>,
    );
    const select = screen.getByRole('combobox', { name: 'Sort By' });
    // Precondition: at rest it is idle.
    expect(select).not.toHaveAttribute('aria-busy');

    fireEvent.click(select);
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Name, Z to A' }));
    });

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe(BY_NAME_DESC);
    expect(select).toHaveAttribute('aria-busy', 'true');

    await act(async () => arrive());

    expect(select).not.toHaveAttribute('aria-busy');
  });
});
