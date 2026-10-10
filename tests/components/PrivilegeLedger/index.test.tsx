import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivilegeLedger from '@/components/PrivilegeLedger';
import { privilegeLedgerHref } from '@/components/PrivilegeLedger/href';
import type { PrivilegeLedgerEntry } from '@/components/PrivilegeLedger/types';

// `/admin/privilege-changes`' filter, table and pager (MB.200): render-only,
// so the page owns the read and this owns what an admin sees of it
// (claude-docs/components/privilege-ledger.md).

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
  it('lists each change with when, who, what, how, by whom and why', () => {
    render(<PrivilegeLedger changes={[GRANT, REVOKE]} filter={{}} />);

    expect(screen.getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
      'When',
      'User',
      'Privilege',
      'Change',
      'How',
      'Changed By',
      'Note',
    ]);
    const [first, second] = rows();
    expect(
      within(first)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      '2026-03-04 05:06 UTC',
      'Ada Fixturewort',
      'Admin',
      'Granted',
      'By an admin',
      'Bram Testwort',
      'Covering the spring audit',
    ]);
    expect(
      within(second)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      '2026-03-03 10:00 UTC',
      'Deleted account',
      'Coven creation',
      'Revoked',
      'Manual fix',
      'Seed System User',
      '',
    ]);
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

    expect(screen.getByText('2026-03-04 05:06 UTC')).toHaveAttribute(
      'datetime',
      '2026-03-04T05:06:07.000Z',
    );
  });

  describe('the filter', () => {
    const assign = vi.fn();
    afterEach(() => {
      assign.mockReset();
      vi.unstubAllGlobals();
    });
    const filterButton = () => screen.getByRole('button', { name: 'Filter' });

    it('is a GET form to the page: the search and the privilege select', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />);

      const form = screen.getByRole('form', { name: 'Filter privilege changes' });
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
          .map((option) => [option.textContent, option.getAttribute('value')]),
      ).toEqual([
        ['All', ''],
        ['Admin', 'admin'],
        ['Coven creation', 'create_workspace'],
      ]);
    });

    it('starts empty when the ledger is not filtered', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      expect(screen.getByRole('searchbox', { name: 'Name or Email' })).toHaveValue('');
      expect(screen.getByRole('combobox', { name: 'Privilege' })).toHaveValue('');
    });

    it('offers Filter only for a new privilege, and opens it from the first page', () => {
      vi.stubGlobal('location', { ...window.location, assign });
      render(<PrivilegeLedger changes={[GRANT]} filter={{ query: 'ada', privilege: 'admin' }} />);
      const privilege = screen.getByRole('combobox', { name: 'Privilege' });
      expect(filterButton()).toBeDisabled();

      fireEvent.change(privilege, { target: { value: 'create_workspace' } });
      expect(filterButton()).toBeEnabled();
      fireEvent.change(privilege, { target: { value: 'admin' } });
      expect(filterButton()).toBeDisabled();

      fireEvent.change(privilege, { target: { value: '' } });
      fireEvent.click(filterButton());

      expect(assign).toHaveBeenCalledWith(privilegeLedgerHref({ query: 'ada' }));
    });

    it('offers Filter for a new query, trimmed, keeping the privilege', () => {
      vi.stubGlobal('location', { ...window.location, assign });
      render(<PrivilegeLedger changes={[GRANT]} filter={{ privilege: 'admin' }} />);
      const query = screen.getByRole('searchbox', { name: 'Name or Email' });

      fireEvent.change(query, { target: { value: '   ' } });
      expect(filterButton()).toBeDisabled();
      fireEvent.change(query, { target: { value: ' Ada ' } });
      fireEvent.click(filterButton());

      expect(assign).toHaveBeenCalledWith(
        privilegeLedgerHref({ query: 'Ada', privilege: 'admin' }),
      );
    });

    it('sends nothing when nothing changed', () => {
      vi.stubGlobal('location', { ...window.location, assign });
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      fireEvent.submit(screen.getByRole('form', { name: 'Filter privilege changes' }));

      expect(assign).not.toHaveBeenCalled();
    });
  });

  it.each([
    [{}, 'No permission changes yet.'],
    [{ query: 'ada@users.test' }, 'No permission changes for “ada@users.test”.'],
    [{ privilege: 'admin' }, 'No admin changes yet.'],
    [{ privilege: 'create_workspace' }, 'No coven creation changes yet.'],
    [{ query: 'ada', privilege: 'admin' }, 'No admin changes for “ada”.'],
    [{ query: 'ada', privilege: 'create_workspace' }, 'No coven creation changes for “ada”.'],
  ] as const)('says plainly when there is nothing to show: %o', (filter, text) => {
    render(<PrivilegeLedger changes={[]} filter={filter} />);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('pages, saying where it stands', () => {
    render(
      <PrivilegeLedger
        changes={[GRANT]}
        filter={{}}
        nextHref={privilegeLedgerHref({}, { after: 'next' })}
        position={{ page: 1, pages: 2 }}
      />,
    );

    const pager = screen.getByRole('navigation', { name: 'Pages' });
    expect(pager).toHaveTextContent('Page 1 of 2');
    expect(within(pager).getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/admin/privilege-changes?after=next',
    );
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
