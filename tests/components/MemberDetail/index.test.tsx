import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import MemberDetail from '@/components/MemberDetail';
import type { MemberDetailProps } from '@/components/MemberDetail/types';
import type { MemberListEntry } from '@/components/MemberList/types';
import Modal from '@/components/Modal';
import { graphqlLink, mockGraphQLQuery } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { HttpResponse } from 'msw/http';
import { renderWithQuery } from '../../support/render-with-query';

// claude-docs/components/member-detail.md

const SELF = 'u-self';
const MEMBER: MemberListEntry = {
  userId: 'u-bo',
  name: 'Bo Fixturewort',
  role: 'member',
  joinedAt: new Date('2026-03-04T05:06:07Z'),
  invitedBy: 'Ash Warden',
  updatedBy: 'Ivy Keeper',
  updatedAt: new Date('2026-04-05T06:07:08Z'),
  email: 'bo@fixture.test',
};
const OWNER_GRANTS = { canChangeRoles: true, canPause: true, canRemove: true };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  vi.clearAllMocks();
  mockGraphQLQuery('MemberPauses', () => ({
    workspace: { id: 'w', memberPauses: { edges: [] } },
  }));
});

const renderDetail = (overrides: Partial<MemberDetailProps> = {}) =>
  renderWithQuery(
    <StatusRegionProvider>
      <Modal title="Bo Fixturewort" onClose={vi.fn()}>
        <MemberDetail workspaceId="w" member={MEMBER} currentUserId={SELF} {...overrides} />
      </Modal>
    </StatusRegionProvider>,
  );

const fact = (term: string) => {
  const dt = within(screen.getByRole('region', { name: 'Membership' })).getByText(term, {
    selector: 'dt',
  });
  return dt.nextElementSibling as HTMLElement;
};

describe('MemberDetail', () => {
  it("shows the row's facts: role, joining date, who invited them and the last change", () => {
    renderDetail();

    expect(fact('Role')).toHaveTextContent('Practitioner');
    expect(fact('Joined')).toHaveTextContent('2026-03-04');
    expect(fact('Invited By')).toHaveTextContent('Ash Warden');
    expect(fact('Updated')).toHaveTextContent('Ivy Keeper');
    expect(fact('Updated')).toHaveTextContent('2026-04-05');
  });

  it('gives an owner Change Role, the Coven Access section and Remove on a member', () => {
    renderDetail(OWNER_GRANTS);

    expect(within(fact('Role')).getByRole('button', { name: 'Change Role for Bo Fixturewort' }));
    expect(screen.getByRole('region', { name: 'Coven Access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Bo Fixturewort' })).toBeInTheDocument();
  });

  it("draws no Coven Access section on an owner's modal, whose access is never paused", () => {
    renderDetail({ ...OWNER_GRANTS, member: { ...MEMBER, role: 'owner' } });

    // Why it could have been drawn: the viewer may pause, and the owner's other actions are there.
    expect(screen.getByRole('button', { name: 'Change Role for Bo Fixturewort' }));
    expect(screen.getByRole('button', { name: 'Remove Bo Fixturewort' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Coven Access' })).toBeNull();
  });

  it('offers no Remove on your own modal, since leaving is the coven page’s', () => {
    renderDetail({ ...OWNER_GRANTS, currentUserId: MEMBER.userId });

    expect(screen.getByRole('button', { name: 'Change Role for Bo Fixturewort' }));
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
  });

  it('shows a member the facts and no actions at all', () => {
    renderDetail();

    expect(fact('Role')).toHaveTextContent('Practitioner');
    expect(screen.queryByRole('region', { name: 'Coven Access' })).toBeNull();
    expect(
      screen.queryAllByRole('button', { name: /^(Change Role|Pause Access|Lift Pause|Remove)/ }),
    ).toEqual([]);
  });

  it('removes the member once confirmed, then closes the modal through onRemoved', async () => {
    const sent: unknown[] = [];
    server.use(
      graphqlLink.mutation('RemoveMember', ({ variables }) => {
        sent.push(variables);
        return HttpResponse.json({ data: { removeMember: true } });
      }),
    );
    const onRemoved = vi.fn();
    renderDetail({ ...OWNER_GRANTS, onRemoved });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Bo Fixturewort' }));
    expect(sent).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([{ workspaceId: 'w', userId: 'u-bo' }]);
  });
});
