import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LeaveWorkspaceButton from '@/components/LeaveWorkspaceButton';
import ActionFailure from '@/components/WorkspaceActions/action-failure';

const { graphqlRequest } = vi.hoisted(() => ({ graphqlRequest: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

describe('ActionFailure', () => {
  it('says a refusal above the buttons it wraps, not beside the one pressed', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));
    render(
      <ActionFailure>
        <LeaveWorkspaceButton workspaceId="00000000-0000-0000-0000-000000000001" name="Fixture" />
      </ActionFailure>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Leave Workspace/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Workspace' }));

    const alert = await screen.findByRole('alert');
    const button = screen.getByRole('button', { name: 'Leave Workspace' });
    // Document order: the notice precedes the button.
    expect(alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
