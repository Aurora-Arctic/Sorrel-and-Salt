import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';
import DeleteWorkspaceButton from '@/components/DeleteWorkspaceButton';
import { expectRefusalUnder } from '../../support/click-feedback';

const { graphqlRequest } = vi.hoisted(() => ({ graphqlRequest: vi.fn() }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const ID = '00000000-0000-0000-0000-000000000001';

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
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then deletes the named workspace and leaves the page', async () => {
    graphqlRequest.mockResolvedValue({ deleteWorkspace: true });
    render(<DeleteWorkspaceButton workspaceId={ID} name="Fixture Coven" />);
    fireEvent.click(screen.getByRole('button', { name: /^Delete Coven/ }));
    const dialog = await screen.findByRole('dialog');
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Coven' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/coven'));
    // The switcher lists covens from a layout the replace does not re-run.
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), { workspaceId: ID });
  });

  it('stays on the page and says why under the button when the service refuses', async () => {
    graphqlRequest.mockRejectedValue(new Error('Forbidden'));

    await openAndConfirm();

    await expectRefusalUnder(screen.getByRole('button', { name: 'Delete Coven' }), 'Delete Coven');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
