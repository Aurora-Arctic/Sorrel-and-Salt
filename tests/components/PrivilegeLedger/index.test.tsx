import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivilegeLedger from '@/components/PrivilegeLedger';
import { privilegeLedgerHref } from '@/components/PrivilegeLedger/href';
import type { PrivilegeLedgerEntry } from '@/components/PrivilegeLedger/types';
import { Navigating } from '../../support/navigating';

// `/admin/privilege-changes`' filter, table and pager (MB.200): render-only,
// so the page owns the read and this owns what an admin sees of it
// (claude-docs/components/privilege-ledger.md).

// The filter applies through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const GRANT: PrivilegeLedgerEntry = {
  id: 'c1',
  at: new Date('2026-03-04T05:06:07Z'),
  subject: { name: 'Ada Fixturewort', href: '/admin/users?query=ada%40users.test' },
  privilege: 'admin',
  change: 'grant',
  via: 'admin',
  actor: { name: 'Bram Testwort', href: '/admin/users?query=bram%40users.test' },
  note: 'Covering the spring audit',
};

const REVOKE: PrivilegeLedgerEntry = {
  id: 'c2',
  at: new Date('2026-03-03T10:00:00Z'),
  subject: null,
  privilege: 'create_workspace',
  change: 'revoke',
  via: 'manual',
  actor: { name: 'Seed System User' },
  note: null,
};

function rows() {
  return screen.getAllByRole('row').slice(1);
}

describe('PrivilegeLedger', () => {
  it('lists each change with when, who, by whom and why', () => {
    render(<PrivilegeLedger changes={[GRANT, REVOKE]} filter={{}} />);

    const [first, second] = rows();
    expect(first).toHaveTextContent('2026-03-04');
    expect(within(first).getByRole('cell', { name: 'Ada Fixturewort' })).toBeInTheDocument();
    expect(within(first).getByRole('cell', { name: 'Bram Testwort' })).toBeInTheDocument();
    expect(
      within(first).getByRole('cell', { name: 'Covering the spring audit' }),
    ).toBeInTheDocument();
    expect(second).toHaveTextContent('2026-03-03');
    expect(within(second).getByRole('cell', { name: 'Seed System User' })).toBeInTheDocument();
  });

  it('links subject and actor to their user rows, and no one the user list leaves out', () => {
    render(<PrivilegeLedger changes={[GRANT, REVOKE]} filter={{}} />);

    const [first, second] = rows();
    expect(within(first).getByRole('link', { name: 'Ada Fixturewort' })).toHaveAttribute(
      'href',
      '/admin/users?query=ada%40users.test',
    );
    expect(within(first).getByRole('link', { name: 'Bram Testwort' })).toHaveAttribute(
      'href',
      '/admin/users?query=bram%40users.test',
    );
    expect(within(second).queryAllByRole('link')).toEqual([]);
  });

  it('marks its time for a machine, in full', () => {
    render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

    expect(within(rows()[0]).getByText(/^2026-03-04/)).toHaveAttribute(
      'datetime',
      '2026-03-04T05:06:07.000Z',
    );
  });

  describe('the filter', () => {
    afterEach(() => router.push.mockReset());
    const inFlight = (ui: ReactNode) => render(<Navigating push={router.push}>{ui}</Navigating>);

    it('is a GET form to the page: the search and the privilege select', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />);

      const form = screen.getByRole('form', { name: 'Filter Privilege Changes' });
      expect(form).toHaveAttribute('method', 'get');
      expect(form).toHaveAttribute('action', '/admin/privilege-changes');
      const query = screen.getByRole('searchbox', { name: 'Name or Email' });
      expect(query).toHaveAttribute('name', 'query');
      expect(query).toHaveValue('ada');
      const privilege = screen.getByRole('combobox', { name: 'Privilege' });
      expect(privilege).toHaveAttribute('name', 'privilege');
      expect(privilege).toHaveValue('admin');
      expect(
        within(privilege)
          .getAllByRole('option')
          .map((option) => option.getAttribute('value')),
      ).toEqual(['', 'admin', 'create_workspace']);
    });

    it('starts empty when the ledger is not filtered', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      expect(screen.getByRole('searchbox', { name: 'Name or Email' })).toHaveValue('');
      expect(screen.getByRole('combobox', { name: 'Privilege' })).toHaveValue('');
    });

    it('offers no Filter button, and opens a new privilege from the first page the moment it changes', async () => {
      inFlight(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />);
      expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.change(screen.getByRole('combobox', { name: 'Privilege' }), {
          target: { value: '' },
        });
      });

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(privilegeLedgerHref({ query: 'ada' }));
    });

    it('opens a new query from its magnifier, trimmed, keeping the privilege', async () => {
      inFlight(<PrivilegeLedger changes={[GRANT]} filter={{ privilege: 'admin' }} />);

      fireEvent.change(screen.getByRole('searchbox', { name: 'Name or Email' }), {
        target: { value: ' Ada ' },
      });
      expect(router.push).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      });

      expect(router.push).toHaveBeenCalledWith(
        privilegeLedgerHref({ query: 'Ada', privilege: 'admin' }),
      );
    });

    it('carries the query typed so far when the privilege changes', async () => {
      inFlight(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      fireEvent.change(screen.getByRole('searchbox', { name: 'Name or Email' }), {
        target: { value: ' Ada ' },
      });
      await act(async () => {
        fireEvent.change(screen.getByRole('combobox', { name: 'Privilege' }), {
          target: { value: 'create_workspace' },
        });
      });

      expect(router.push).toHaveBeenCalledWith(
        privilegeLedgerHref({ query: 'Ada', privilege: 'create_workspace' }),
      );
    });

    // Clear is CompendiumList's to test; this asserts which of the
    // ledger's values count as a filter.
    it('offers Clear to the unfiltered ledger only while the query or the privilege is shown', () => {
      for (const filter of [{ query: 'ada' }, { privilege: 'admin' as const }]) {
        const { unmount } = render(<PrivilegeLedger changes={[GRANT]} filter={filter} />);

        expect(screen.getByRole('link', { name: 'Clear' })).toHaveAttribute(
          'href',
          '/admin/privilege-changes',
        );
        unmount();
      }

      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);
      expect(screen.queryByRole('link', { name: 'Clear' })).not.toBeInTheDocument();
    });

    // The page renders again with another filter on Back or Forward; the row
    // starts from it rather than from what was typed.
    it('starts again from the filter shown when the page shows another', () => {
      const { rerender } = render(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada' }} />);
      fireEvent.change(screen.getByRole('searchbox', { name: 'Name or Email' }), {
        target: { value: 'draft' },
      });

      rerender(
        <PrivilegeLedger changes={[GRANT]} filter={{ query: 'bram', privilege: 'admin' }} />,
      );

      expect(screen.getByRole('searchbox', { name: 'Name or Email' })).toHaveValue('bram');
      expect(screen.getByRole('combobox', { name: 'Privilege' })).toHaveValue('admin');
    });
  });

  it('draws no table when there is nothing to show', () => {
    render(<PrivilegeLedger changes={[]} filter={{ query: 'ada', privilege: 'admin' }} />);

    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('privilegeLedgerHref', () => {
  it('writes the filter and the cursor, and nothing for none', () => {
    expect(privilegeLedgerHref({})).toBe('/admin/privilege-changes');
    expect(privilegeLedgerHref({ query: 'a b', privilege: 'admin' }, { before: 'b' })).toBe(
      '/admin/privilege-changes?query=a+b&privilege=admin&before=b',
    );
  });
});
