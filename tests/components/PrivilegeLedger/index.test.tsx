import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivilegeLedger from '@/components/PrivilegeLedger';
import { privilegeLedgerHref } from '@/components/PrivilegeLedger/href';
import type { PrivilegeLedgerEntry } from '@/components/PrivilegeLedger/types';
import { FILTER_ROWS } from '../../support/filter-form';
import { Navigating } from '../../support/navigating';
import type { FilterFormSubject } from '../../support/types';

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

    // All Privileges is blank, so a native submit sends `privilege=`, which
    // the page reads as no privilege.
    const SUBJECT: FilterFormSubject = {
      label: 'Filter Privilege Changes',
      path: '/admin/privilege-changes',
      searchLabel: 'Name or Email',
      push: router.push,
      none: { list: <PrivilegeLedger changes={[GRANT]} filter={{}} />, sends: 'query=&privilege=' },
      shown: {
        list: <PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />,
        sends: 'query=ada&privilege=admin',
      },
      alone: [
        {
          list: <PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada' }} />,
          sends: 'query=ada&privilege=',
        },
        {
          list: <PrivilegeLedger changes={[GRANT]} filter={{ privilege: 'admin' }} />,
          sends: 'query=&privilege=admin',
        },
      ],
      searched: privilegeLedgerHref({ query: 'Two words', privilege: 'admin' }),
    };

    it.each(FILTER_ROWS)('%s', (_title, run) => run(SUBJECT));

    it('offers every privilege, after the option for all', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      const privilege = screen.getByRole('combobox', { name: 'Privilege' });
      expect(
        within(privilege)
          .getAllByRole('option')
          .map((option) => option.getAttribute('value')),
      ).toEqual(['', 'admin', 'create_workspace']);
    });

    it('opens a new privilege from the first page the moment it changes', async () => {
      inFlight(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />);

      await act(async () => {
        fireEvent.change(screen.getByRole('combobox', { name: 'Privilege' }), {
          target: { value: '' },
        });
      });

      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(privilegeLedgerHref({ query: 'ada' }));
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
