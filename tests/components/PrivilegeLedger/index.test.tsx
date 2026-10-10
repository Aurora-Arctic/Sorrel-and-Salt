import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrivilegeLedger from '@/components/PrivilegeLedger';
import { privilegeLedgerHref } from '@/components/PrivilegeLedger/href';
import type { PrivilegeLedgerEntry } from '@/components/PrivilegeLedger/types';

// `/admin/privilege-changes`' filter, table and pager (MB.200): render-only,
// so the page owns the read and this owns what an admin sees of it
// (claude-docs/components/privilege-ledger.md).

const SUBJECT = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

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

  describe('the privilege filter', () => {
    const assign = vi.fn();
    afterEach(() => {
      assign.mockReset();
      vi.unstubAllGlobals();
    });
    const filterButton = () => screen.getByRole('button', { name: 'Filter' });

    it('is a GET form to the page, its privilege a native select keeping the user', () => {
      render(
        <PrivilegeLedger changes={[GRANT]} filter={{ userId: SUBJECT, privilege: 'admin' }} />,
      );

      const form = screen.getByRole('form', { name: 'Filter privilege changes' });
      expect(form).toHaveAttribute('method', 'get');
      expect(form).toHaveAttribute('action', '/admin/privilege-changes');
      expect(form.querySelector('input[type="hidden"][name="user"]')).toHaveValue(SUBJECT);
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

    it('carries no user when the ledger is not narrowed to one', () => {
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      const form = screen.getByRole('form', { name: 'Filter privilege changes' });
      expect(form.querySelector('input[name="user"]')).toBeNull();
      expect(screen.getByRole('combobox', { name: 'Privilege' })).toHaveValue('');
    });

    it('offers Filter only for a new privilege, and opens it from the first page', () => {
      vi.stubGlobal('location', { ...window.location, assign });
      render(
        <PrivilegeLedger changes={[GRANT]} filter={{ userId: SUBJECT, privilege: 'admin' }} />,
      );
      const privilege = screen.getByRole('combobox', { name: 'Privilege' });
      expect(filterButton()).toBeDisabled();

      fireEvent.change(privilege, { target: { value: 'create_workspace' } });
      expect(filterButton()).toBeEnabled();
      fireEvent.change(privilege, { target: { value: 'admin' } });
      expect(filterButton()).toBeDisabled();

      fireEvent.change(privilege, { target: { value: '' } });
      fireEvent.click(filterButton());

      expect(assign).toHaveBeenCalledWith(privilegeLedgerHref({ userId: SUBJECT }));
    });

    it('sends nothing when nothing changed', () => {
      vi.stubGlobal('location', { ...window.location, assign });
      render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

      fireEvent.submit(screen.getByRole('form', { name: 'Filter privilege changes' }));

      expect(assign).not.toHaveBeenCalled();
    });
  });

  it('says whose changes it shows, and links back to every user', () => {
    render(
      <PrivilegeLedger
        changes={[GRANT]}
        filter={{ userId: SUBJECT, privilege: 'admin' }}
        subjectName="Ada Fixturewort"
      />,
    );

    expect(screen.getByText(/Changes to Ada Fixturewort only\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show Every User' })).toHaveAttribute(
      'href',
      privilegeLedgerHref({ privilege: 'admin' }),
    );
  });

  it('shows no user line when the ledger is not narrowed to one', () => {
    render(<PrivilegeLedger changes={[GRANT]} filter={{}} />);

    expect(screen.queryByRole('link', { name: 'Show Every User' })).toBeNull();
  });

  it.each([
    [{}, undefined, 'No privilege has changed yet.'],
    [{ privilege: 'admin' }, undefined, 'No changes to who is an admin.'],
    [{ privilege: 'create_workspace' }, undefined, 'No changes to who may create a coven.'],
    [{ userId: SUBJECT }, 'Ada Fixturewort', 'No changes to Ada Fixturewort’s privileges.'],
    [
      { userId: SUBJECT, privilege: 'create_workspace' },
      'Ada Fixturewort',
      'No changes to whether Ada Fixturewort may create a coven.',
    ],
    [{ userId: SUBJECT }, undefined, 'No changes to this account’s privileges.'],
  ] as const)('says plainly when there is nothing to show: %o', (filter, name, text) => {
    render(<PrivilegeLedger changes={[]} filter={filter} subjectName={name} />);

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
    expect(privilegeLedgerHref({ userId: SUBJECT, privilege: 'admin' }, { before: 'b' })).toBe(
      `/admin/privilege-changes?user=${SUBJECT}&privilege=admin&before=b`,
    );
  });
});
