import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import LeaveWorkspaceButton from '@/components/LeaveWorkspaceButton';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

const { replace, refresh, graphqlRequest } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const ID = '00000000-0000-0000-0000-000000000001';

describe('LeaveWorkspaceButton', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then leaves the named workspace and lands on the coven landing', async () => {
    graphqlRequest.mockResolvedValue({ leaveWorkspace: true });
    render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />, {
      wrapper: StatusRegionProvider,
    });
    fireEvent.click(screen.getByRole('button', { name: /^Leave Coven/ }));
    const dialog = await screen.findByRole('dialog');
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Coven' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/coven'));
    // The switcher lists covens from a layout the replace does not re-run.
    expect(refresh).toHaveBeenCalledOnce();
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), { workspaceId: ID });
    // The landing it opens is the news; the status region says nothing.
    expect(announced()).toBe('');
  });

  it('stays on the page and says why under the button when the service refuses', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
    fireEvent.click(screen.getByRole('button', { name: /^Leave Coven/ }));
    const dialog = await screen.findByRole('dialog');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Coven' }));
    });

    await expectRefusalUnder(screen.getByRole('button', { name: 'Leave Coven' }), 'Leave Coven');
    expect(replace).not.toHaveBeenCalled();
  });
});
