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
