import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Change Role control (M6.13): it asks which role in a modal, sends
// the change, and closes the modal when the answer comes back, since the
// member's row survives the re-read and does not replace it.

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const graphqlRequest = vi.fn();
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const { default: RoleControl } = await import('@/components/MemberList/role-control');

const renderControl = () =>
  render(<RoleControl workspaceId="w" userId="u" name="Testwort" currentRole="viewer" />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoleControl', () => {
  it('sends the chosen role and closes the modal when the answer comes back', async () => {
    graphqlRequest.mockResolvedValue({});
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Change Role for Testwort' }));
    fireEvent.click(screen.getByRole('radio', { name: /^Owner/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: 'w',
      userId: 'u',
      role: 'owner',
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('starts on the first other role and keeps the choices as drawn while the change is out', async () => {
    graphqlRequest.mockReturnValue(new Promise(() => {}));
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Change Role for Testwort' }));
    expect(screen.getByRole('radio', { name: /^Member/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
    fireEvent.click(screen.getByRole('radio', { name: /^Owner/ }));

    // Not drawn as shut, and the pick does not move once the change is sent.
    expect(screen.getByRole('radio', { name: /^Owner/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /^Member/ })).toBeChecked();
  });

  it('confirms with Demote when the chosen role is below the member’s own, and Promote above it', async () => {
    graphqlRequest.mockResolvedValue({});
    render(<RoleControl workspaceId="w" userId="u" name="Testwort" currentRole="member" />);

    fireEvent.click(screen.getByRole('button', { name: 'Change Role for Testwort' }));
    // The first other role is the viewer, below a member.
    expect(screen.getByRole('button', { name: 'Demote' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Owner/ }));
    expect(screen.getByRole('button', { name: 'Promote' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demote' })).not.toBeInTheDocument();
  });
});
