import { render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import MemberList from '@/components/MemberList';
import { longMinuteInZone } from '@/lib/utc';
import { printed } from '../../support/printed-text';
import { WORKSPACE_ROLE_ACCESS } from '@/components/MemberList/role-access';
import type { MemberListEntry } from '@/components/MemberList/types';
import { rowCells } from '../../support/table';

// A coven's member list (claude-docs/components/member-list.md): one row per
// member with their role and joining date, a name opening the member's modal, and
// the signed-in member's own row marked.

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const OWNER: MemberListEntry = {
  userId: 'u-owner',
  name: 'Testwort Owner',
  role: 'owner',
  joinedAt: new Date('2026-03-04T05:06:07Z'),
  updatedBy: 'Testwort Editor',
  updatedAt: new Date('2026-05-06T07:08:09Z'),
  invitedBy: 'Testwort Inviter',
};
const MEMBER: MemberListEntry = {
  ...OWNER,
  userId: 'u-member',
  name: 'Testwort Member',
  role: 'member',
};
const VIEWER: MemberListEntry = {
  ...OWNER,
  userId: 'u-viewer',
  name: 'Testwort Viewer',
  role: 'viewer',
};
const ALL = [OWNER, MEMBER, VIEWER];

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('MemberList', () => {
  it('gives every row a tooltip saying what its role may do, in the words Change Role shows', () => {
    render(<MemberList members={ALL} currentUserId="someone-else" />);
    for (const member of ALL) {
      const row = rowOf(member.name);
      const label = { owner: 'Steward', member: 'Practitioner', viewer: 'Observer' }[member.role];
      const button = within(row).getByRole('button', { name: `About ${label}` });
      const tip = document.getElementById(button.getAttribute('aria-describedby')!);
      expect(tip).toHaveAttribute('role', 'tooltip');
      expect(tip).toHaveTextContent(WORKSPACE_ROLE_ACCESS[member.role]);
    }
  });

  it('shows each member with their role, joining date and last change', () => {
    render(<MemberList members={ALL} currentUserId="someone-else" />);
    for (const [member, role] of [
      [OWNER, 'Steward'],
      [MEMBER, 'Practitioner'],
      [VIEWER, 'Observer'],
    ] as const) {
      const row = rowOf(member.name);
      expect(within(row).getByRole('cell', { name: new RegExp(`^${role}`) })).toBeTruthy();
      expect(within(row).getByText('2026-03-04')).toBeTruthy();
      // Who last changed the membership, and when.
      expect(within(row).getByText('Testwort Editor')).toBeTruthy();
      expect(within(row).getByText('2026-05-06')).toBeTruthy();
    }
  });

  it("leaves the Updated cell empty when the editor's name is withheld", () => {
    render(
      <MemberList
        members={[{ ...MEMBER, updatedBy: null, updatedAt: null }]}
        currentUserId={OWNER.userId}
      />,
    );
    const row = rowOf(MEMBER.name);
    expect(within(row).queryByText('Testwort Editor')).toBeNull();
    expect(within(row).queryByText('2026-05-06')).toBeNull();
  });

  it('shows who invited a member, and leaves the cell empty for someone nobody invited', () => {
    render(
      <MemberList members={[MEMBER, { ...OWNER, invitedBy: null }]} currentUserId={OWNER.userId} />,
    );
    expect(screen.getByRole('columnheader', { name: 'Invited By' })).toBeTruthy();
    expect(within(rowOf(MEMBER.name)).getByText('Testwort Inviter')).toBeTruthy();
    expect(within(rowOf(OWNER.name)).queryByText('Testwort Inviter')).toBeNull();
  });

  it('links each name to its member modal, and draws no action on any row', () => {
    const heading = (name: string) => ({ eyebrow: 'Member', title: name });
    render(
      <MemberList
        members={ALL.map((member) => ({
          ...member,
          openHref: `/coven/w/members?member=${member.userId}` as Route,
          heading: heading(member.name),
        }))}
        currentUserId={OWNER.userId}
        showEmail
        showAccess
      />,
    );
    for (const { name, userId } of ALL) {
      const row = rowOf(name);
      expect(within(row).getByRole('link', { name })).toHaveAttribute(
        'href',
        `/coven/w/members?member=${userId}`,
      );
      // The role tip is the one button a row holds: the actions are the modal's.
      expect(within(row).getAllByRole('button')).toEqual([
        within(row).getByRole('button', { name: /^About / }),
      ]);
    }
    expect(screen.queryByRole('columnheader', { name: 'Remove' })).toBeNull();
  });

  it('marks each row’s access in the Access column, a standing pause with its end in the site’s date form or none', () => {
    const AT = new Date('2026-11-20T09:30:00Z');
    render(
      <MemberList
        members={[
          { ...MEMBER, paused: { until: null } },
          { ...OWNER, paused: { until: AT } },
          { ...VIEWER, paused: null },
        ]}
        currentUserId={OWNER.userId}
        showAccess
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Access' })).toBeTruthy();
    expect(within(rowOf(MEMBER.name)).getByText('Paused with no end date')).toBeTruthy();
    // The site's long date form, in the viewer's own zone once drawn on the client, as `LocalTime` prints it.
    const end = printed(longMinuteInZone(AT));
    expect(within(rowOf(OWNER.name)).getByText(`Paused until ${end}`)).toBeTruthy();
    expect(within(rowOf(OWNER.name)).getByText(`Until ${end}`)).toBeTruthy();
    // The check's tip repeats its word, so the word is read from the page, not the hover bubble.
    expect(
      within(rowOf(VIEWER.name)).getByText('Not paused', { ignore: '[aria-hidden="true"]' }),
    ).toBeTruthy();
    expect(within(rowOf(VIEWER.name)).queryByText(/^Paused/)).toBeNull();
  });

  it('draws no Access column where the page does not ask, though a row carries a pause', () => {
    render(
      <MemberList
        members={[{ ...MEMBER, paused: { until: null } }]}
        currentUserId={OWNER.userId}
      />,
    );
    expect(screen.queryByRole('columnheader', { name: 'Access' })).toBeNull();
    expect(screen.queryByText(/paused/i)).toBeNull();
  });

  it('marks only the signed-in member’s own row', () => {
    render(<MemberList members={ALL} currentUserId={MEMBER.userId} />);
    expect(within(rowOf(MEMBER.name)).getByText('You')).toBeTruthy();
    expect(within(rowOf(OWNER.name)).queryByText('You')).toBeNull();
    expect(within(rowOf(VIEWER.name)).queryByText('You')).toBeNull();
  });

  // The page passes `showEmail` to owners alone.
  it("shows each member's address, where the page asks", () => {
    render(
      <MemberList
        members={[
          { ...OWNER, email: 'owner@testwort.test' },
          { ...MEMBER, email: 'member@testwort.test' },
        ]}
        currentUserId={OWNER.userId}
        showEmail
      />,
    );
    for (const [member, address] of [
      [OWNER, 'owner@testwort.test'],
      [MEMBER, 'member@testwort.test'],
    ] as const) {
      expect(rowCells(rowOf(member.name))[1]).toHaveTextContent(address);
    }
  });

  it('draws no address where the page does not ask, though the rows carry one', () => {
    render(
      <MemberList
        members={[{ ...MEMBER, email: 'member@testwort.test' }]}
        currentUserId={OWNER.userId}
      />,
    );
    expect(screen.getByRole('table')).not.toHaveTextContent('member@testwort.test');
  });
});
