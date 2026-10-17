import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeleteWorkspaceButton from '@/components/DeleteWorkspaceButton';

const { replace, refresh, graphqlRequest } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const ID = '00000000-0000-0000-0000-000000000001';

/** Presses Delete Coven, then the same-named confirm inside the modal it opens. */
async function openAndConfirm() {
  render(<DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
  fireEvent.click(screen.getByRole('button', { name: /^Delete Coven/ }));
  const dialog = await screen.findByRole('dialog');
  // Async, so the request's settling updates land inside act rather than after it.
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Coven' }));
  });
}

describe('DeleteWorkspaceButton', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then deletes the named workspace and leaves the page', async () => {
    graphqlRequest.mockResolvedValue({ deleteWorkspace: true });
    render(<DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
    fireEvent.click(screen.getByRole('button', { name: /^Delete Coven/ }));
    const dialog = await screen.findByRole('dialog');
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Coven' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/coven'));
    // The switcher lists covens from a layout the replace does not re-run.
    expect(refresh).toHaveBeenCalledOnce();
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), { workspaceId: ID });
  });

  it('stays on the page and says why when the service refuses', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));

    await openAndConfirm();

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
