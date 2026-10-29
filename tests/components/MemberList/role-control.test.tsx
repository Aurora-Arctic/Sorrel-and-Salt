import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

// The Change Role control: it asks which role in a modal, sends
// the change, and closes the modal when the answer comes back, since the
// member's row survives the re-read and does not replace it.

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const graphqlRequest = vi.fn();
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const { default: RoleControl } = await import('@/components/MemberList/role-control');

const renderControl = () =>
  render(<RoleControl workspaceId="w" userId="u" name="Testwort" currentRole="viewer" />, {
    wrapper: StatusRegionProvider,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoleControl', () => {
  // The service's sentence alone, with no prefix naming the member: the
  // callout hangs from that member's row.
  it("says the service's refusal under the control, the focus back on it", async () => {
    graphqlRequest.mockRejectedValue(
      new GraphQLClientError({
        status: 200,
        errors: [{ message: 'A coven needs at least one owner.' }],
      }),
    );
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Change Role for Testwort' }));
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));

    const name = 'Change Role for Testwort';
    const said = await expectRefusalUnder(screen.getByRole('button', { name }), name);
    expect(said).toBe('A coven needs at least one owner.');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('sends the chosen role, closes the modal when the answer comes back, and says so', async () => {
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
    expect(announced()).toContain('Testwort');
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
