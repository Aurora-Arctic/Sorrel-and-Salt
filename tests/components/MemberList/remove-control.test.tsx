import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActionFailure from '@/components/ActionFailure';
import RemoveControl from '@/components/MemberList/remove-control';

const { refresh, graphqlRequest } = vi.hoisted(() => ({
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const USER = '00000000-0000-0000-0000-000000000002';

async function openAndConfirm(wrapped = true) {
  const control = <RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />;
  render(wrapped ? <ActionFailure>{control}</ActionFailure> : control);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Member' }));
  const dialog = await screen.findByRole('dialog');
  // Async, so the refusal's updates land inside act rather than after it.
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
  });
}

describe('RemoveControl', () => {
  beforeEach(() => {
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then removes the named member and reads the page again', async () => {
    graphqlRequest.mockResolvedValue({ removeMember: true });
    render(<RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fixture Member' }));
    const dialog = await screen.findByRole('dialog');
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: WORKSPACE,
      userId: USER,
    });
  });

  it('says why above the table when the service refuses', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));

    await openAndConfirm();

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows a refusal beside the control when nothing above it says one', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));

    await openAndConfirm(false);

    // The control stands outside an ActionFailure, so it must say the refusal
    // itself rather than drop it.
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });
});

// The row's own Remove takes its row with it: the members page, the
// invitations' Revoke and Remove, the account page's Decline and the admin
// invitations' Revoke all ask through ConfirmedAction's modal, so one row
// proves the landing for them all (M8.17, after M12.31's follow-up 5).
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
        <ActionFailure>
          {present && <RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />}
        </ActionFailure>
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
    const view = await confirmFrom(render(<Roll present />));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    // Busy until the re-read: the row and its button are still there.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    view.rerender(<Roll present={false} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toHaveFocus();
  });

  it('stays on the row when the service refuses, since the row stays', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    await confirmFrom(render(<Roll present />));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove Fixture Member' })).toHaveFocus();
  });
});
