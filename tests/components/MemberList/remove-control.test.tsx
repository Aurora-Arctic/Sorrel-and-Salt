import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import RemoveControl from '@/components/MemberList/remove-control';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

const { refresh, graphqlRequest } = vi.hoisted(() => ({
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const USER = '00000000-0000-0000-0000-000000000002';
const NAME = 'Remove Fixture Member';

async function openAndConfirm() {
  render(<RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />, {
    wrapper: StatusRegionProvider,
  });
  fireEvent.click(screen.getByRole('button', { name: NAME }));
  const dialog = await screen.findByRole('dialog');
  expect(graphqlRequest).not.toHaveBeenCalled();
  // Async, so the answer's updates land inside act rather than after it.
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
  });
}

describe('RemoveControl', () => {
  beforeEach(() => {
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then removes the named member, reads the page again and says so', async () => {
    graphqlRequest.mockResolvedValue({ removeMember: true });

    await openAndConfirm();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: WORKSPACE,
      userId: USER,
    });
    expect(announced()).toContain('Fixture Member');
  });

  // The service's sentence alone, with no prefix naming the member: the
  // callout hangs from that member's row.
  it("says the service's refusal under the control when the service refuses", async () => {
    graphqlRequest.mockRejectedValue(
      new GraphQLClientError({
        status: 200,
        errors: [{ message: 'A coven needs at least one owner.' }],
      }),
    );

    await openAndConfirm();

    const said = await expectRefusalUnder(screen.getByRole('button', { name: NAME }), NAME);
    expect(said).toBe('A coven needs at least one owner.');
    expect(refresh).not.toHaveBeenCalled();
    expect(announced()).toBe('');
  });
});

// The row's own Remove takes its row with it: the members page, the
// invitations' Revoke and Remove, the account page's Decline and the admin
// invitations' Revoke all ask through ConfirmedAction's modal, so one row
// proves the landing for them all (after M12.31's follow-up 5).
describe('RemoveControl, where the focus lands', () => {
  beforeEach(() => {
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  /** The roll's heading, and the one row while it is in the page. */
  function Roll({ present }: { present: boolean }) {
    return (
      <main>
        <h1>Members</h1>
        {present && <RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />}
      </main>
    );
  }

  async function confirmFrom(view: ReturnType<typeof render>) {
    const open = screen.getByRole('button', { name: 'Remove Fixture Member' });
    open.focus();
    fireEvent.click(open);
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });
    return view;
  }

  it("goes to the page's heading once the re-read takes the row away", async () => {
    graphqlRequest.mockResolvedValue({ removeMember: true });
    const view = await confirmFrom(render(<Roll present />, { wrapper: StatusRegionProvider }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    // Busy until the re-read: the row and its button are still there.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    view.rerender(<Roll present={false} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toHaveFocus();
  });

  it('stays on the row when the service refuses, since the row stays', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    await confirmFrom(render(<Roll present />, { wrapper: StatusRegionProvider }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove Fixture Member' })).toHaveFocus();
  });
});
