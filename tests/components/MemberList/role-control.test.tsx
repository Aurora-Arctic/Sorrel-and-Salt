import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Promote and Demote control (M6.13): it asks which role in a modal, sends
// the change, and closes the modal when the answer comes back, since the
// member's row survives the re-read and does not replace it.

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const graphqlRequest = vi.fn();
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const { default: RoleControl } = await import('@/components/MemberList/role-control');

const renderControl = () =>
  render(
    <RoleControl
      workspaceId="w"
      userId="u"
      name="Testwort"
      direction="promote"
      options={['member', 'owner']}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoleControl', () => {
  it('sends the chosen role and closes the modal when the answer comes back', async () => {
    graphqlRequest.mockResolvedValue({});
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Promote Testwort' }));
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

  it('starts on the nearest role and keeps the choices as drawn while the change is out', async () => {
    graphqlRequest.mockReturnValue(new Promise(() => {}));
    renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Promote Testwort' }));
    expect(screen.getByRole('radio', { name: /^Member/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Promote' }));
    fireEvent.click(screen.getByRole('radio', { name: /^Owner/ }));

    // Not drawn as shut, and the pick does not move once the change is sent.
    expect(screen.getByRole('radio', { name: /^Owner/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /^Member/ })).toBeChecked();
  });
});
