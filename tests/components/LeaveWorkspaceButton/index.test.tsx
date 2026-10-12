import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveWorkspaceButton from '@/components/LeaveWorkspaceButton';

const { replace, graphqlRequest } = vi.hoisted(() => ({
  replace: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const ID = '00000000-0000-0000-0000-000000000001';

describe('LeaveWorkspaceButton', () => {
  beforeEach(() => {
    replace.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then leaves the named workspace and goes home', async () => {
    graphqlRequest.mockResolvedValue({ leaveWorkspace: true });
    render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
    fireEvent.click(screen.getByRole('button', { name: /^Leave Workspace/ }));
    const dialog = await screen.findByRole('dialog');
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Workspace' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), { workspaceId: ID });
  });

  it('stays on the page and says why when the service refuses', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
    fireEvent.click(screen.getByRole('button', { name: /^Leave Workspace/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Workspace' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
