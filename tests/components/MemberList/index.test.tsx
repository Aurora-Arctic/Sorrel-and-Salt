import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MemberList from '@/components/MemberList';
import type { MemberListEntry } from '@/components/MemberList/types';

// A coven's member list (claude-docs/components/member-list.md): one row per
// member with their role and joining date, an action slot the page fills, and
// the signed-in member's own row marked.

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
  it('shows each member with their role, joining date and last change', () => {
    render(<MemberList members={ALL} currentUserId="someone-else" />);
    for (const [member, role] of [
      [OWNER, 'Owner'],
      [MEMBER, 'Member'],
      [VIEWER, 'Viewer'],
    ] as const) {
      const row = rowOf(member.name);
      expect(within(row).getByRole('cell', { name: role })).toBeTruthy();
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

  it('has no Remove column when no removeAction is passed', () => {
    render(<MemberList members={ALL} currentUserId={OWNER.userId} />);
    expect(screen.queryByRole('columnheader', { name: 'Remove' })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it("puts each control on its row, given that row's member", () => {
    render(
      <MemberList
        members={ALL}
        currentUserId={OWNER.userId}
        roleAction={(member) => <button type="button">Change {member.name}</button>}
        removeAction={(member) => <button type="button">Remove {member.name}</button>}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Remove' })).toBeTruthy();
    for (const { name } of ALL) {
      const row = rowOf(name);
      expect(within(row).getByRole('button', { name: `Change ${name}` })).toBeTruthy();
      expect(within(row).getByRole('button', { name: `Remove ${name}` })).toBeTruthy();
    }
  });

  it('keeps the role control in the Role cell, apart from Remove', () => {
    render(
      <MemberList
        members={[MEMBER]}
        currentUserId={OWNER.userId}
        roleAction={() => <button type="button">Demote</button>}
        removeAction={() => <button type="button">Remove</button>}
      />,
    );
    const cells = within(rowOf(MEMBER.name)).getAllByRole('cell');
    const [role, remove] = [cells[1], cells[cells.length - 1]];
    expect(within(role).getByRole('button', { name: 'Demote' })).toBeTruthy();
    expect(within(remove).getByRole('button', { name: 'Remove' })).toBeTruthy();
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
      expect(within(rowOf(member.name)).getAllByRole('cell')[1]).toHaveTextContent(address);
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
