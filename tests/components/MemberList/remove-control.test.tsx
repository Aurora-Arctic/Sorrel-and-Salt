import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import RemoveControl from '@/components/MemberList/remove-control';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { announced, expectRefusalUnder } from '../../support/click-feedback';

const { refresh, graphqlRequest } = vi.hoisted(() => ({
  refresh: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';
const USER = '00000000-0000-0000-0000-000000000002';
const NAME = 'Remove Fixture Member';

async function openAndConfirm() {
  render(<RemoveControl workspaceId={WORKSPACE} userId={USER} name="Fixture Member" />, {
    wrapper: StatusRegionProvider,
  });
  fireEvent.click(screen.getByRole('button', { name: NAME }));
  const dialog = await screen.findByRole('dialog');
  expect(graphqlRequest).not.toHaveBeenCalled();
  // Async, so the answer's updates land inside act rather than after it.
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
  });
}

describe('RemoveControl', () => {
  beforeEach(() => {
    refresh.mockReset();
    graphqlRequest.mockReset();
  });

  it('sends nothing until confirmed, then removes the named member, reads the page again and says so', async () => {
    graphqlRequest.mockResolvedValue({ removeMember: true });

    await openAndConfirm();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(graphqlRequest).toHaveBeenCalledWith(expect.anything(), {
      workspaceId: WORKSPACE,
      userId: USER,
    });
    expect(announced()).toContain('Fixture Member');
  });

  // The service's sentence alone, with no prefix naming the member: the
  // callout hangs from that member's row (the owner's call, 2026-10-20).
  it("says the service's refusal under the control when the service refuses", async () => {
    graphqlRequest.mockRejectedValue(
      new GraphQLClientError({
        status: 200,
        errors: [{ message: 'A coven needs at least one owner.' }],
      }),
    );

    await openAndConfirm();

    const said = await expectRefusalUnder(screen.getByRole('button', { name: NAME }), NAME);
    expect(said).toBe('A coven needs at least one owner.');
    expect(refresh).not.toHaveBeenCalled();
    expect(announced()).toBe('');
  });
});
