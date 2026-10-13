import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveWorkspaceButton from '@/components/LeaveWorkspaceButton';

// The only owner's Leave (M6.16): the page hands the button the members who
// could take over, and pressing it asks what happens to the coven, a
// hand-over or a deletion, never only one. The requests are mocked; what the
// service decides is its own tests'.

const { replace, graphqlRequest } = vi.hoisted(() => ({
  replace: vi.fn(),
  graphqlRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock('@/lib/graphql-client', () => ({ graphqlRequest }));

const ID = '00000000-0000-0000-0000-000000000001';
const OTHER = '00000000-0000-0000-0000-000000000002';
const THIRD = '00000000-0000-0000-0000-000000000003';
const SUCCESSORS = [
  { userId: OTHER, name: 'Fixture B', role: 'member' as const },
  { userId: THIRD, name: 'Fixture C', role: 'viewer' as const },
];

const handOver = (dialog: HTMLElement) => within(dialog).getByRole('radio', { name: /^Hand It/ });
const deleteIt = (dialog: HTMLElement) => within(dialog).getByRole('radio', { name: /^Delete It/ });

/** Types into the New Owner box and picks the named member from its list. */
function choose(dialog: HTMLElement, name: string) {
  const box = within(dialog).getByRole('combobox', { name: 'New Owner' });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: name } });
  fireEvent.click(within(dialog).getByRole('option', { name: new RegExp(name) }));
}

async function openDialog(successors = SUCCESSORS) {
  render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={successors} />);
  fireEvent.click(screen.getByRole('button', { name: /^Leave Coven/ }));
  return screen.findByRole('dialog');
}

describe('LeaveWorkspaceButton for the only owner', () => {
  beforeEach(() => {
    replace.mockReset();
    graphqlRequest.mockReset();
  });

  it('stays enabled, and opens a dialog offering both a hand-over and a deletion', async () => {
    render(<LeaveWorkspaceButton workspaceId={ID} name="Fixture Coven" successors={SUCCESSORS} />);
    const leave = screen.getByRole('button', { name: /^Leave Coven/ });
    expect(leave).toBeEnabled();

    fireEvent.click(leave);
    const dialog = await screen.findByRole('dialog');

    expect(handOver(dialog)).toBeChecked();
    expect(deleteIt(dialog)).toBeEnabled();
    expect(within(dialog).getByRole('combobox', { name: 'New Owner' })).toBeEnabled();
    expect(graphqlRequest).not.toHaveBeenCalled();
  });

  it('searches the other members by name, each with their role, and offers a hand-over only once one is chosen', async () => {
    const dialog = await openDialog();
    const promote = within(dialog).getByRole('button', { name: 'Promote and Leave' });
    expect(promote).toBeDisabled();

    const box = within(dialog).getByRole('combobox', { name: 'New Owner' });
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'fixture c' } });

    expect(within(dialog).getAllByRole('option')).toHaveLength(1);
    // The row names the member with their role, so a viewer is known for one.
    expect(within(dialog).getByRole('option', { name: /Fixture C.*Viewer/ })).toBeInTheDocument();
    // The role is no search term: "viewer" finds nobody.
    fireEvent.change(box, { target: { value: 'viewer' } });
    expect(within(dialog).queryAllByRole('option')).toHaveLength(0);

    fireEvent.change(box, { target: { value: 'fixture c' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Fixture C/ }));
    expect(promote).toBeEnabled();
    // Chosen, the box describes the member by their role.
    expect(box).toHaveAccessibleDescription(/Viewer/);
  });

  it('promotes the chosen member first, then leaves, then goes home', async () => {
    graphqlRequest.mockResolvedValue({});
    const dialog = await openDialog();
    choose(dialog, 'Fixture C');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Promote and Leave' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(graphqlRequest).toHaveBeenCalledTimes(2);
    expect(graphqlRequest.mock.calls[0][1]).toEqual({
      workspaceId: ID,
      userId: THIRD,
      role: 'owner',
    });
    expect(graphqlRequest.mock.calls[1][1]).toEqual({ workspaceId: ID });
  });

  it('offers the one other member by name, with nothing to search', async () => {
    graphqlRequest.mockResolvedValue({});
    const dialog = await openDialog([SUCCESSORS[0]]);

    expect(within(dialog).queryByRole('combobox')).toBeNull();
    expect(within(dialog).getByRole('radio', { name: /Fixture B/ })).toBeChecked();
    const promote = within(dialog).getByRole('button', { name: 'Promote and Leave' });
    expect(promote).toBeEnabled();

    fireEvent.click(promote);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(graphqlRequest.mock.calls[0][1]).toEqual({
      workspaceId: ID,
      userId: OTHER,
      role: 'owner',
    });
  });

  it('stays, and says so, when the leave fails after the promotion', async () => {
    graphqlRequest.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Forbidden'));
    const dialog = await openDialog();
    choose(dialog, 'Fixture B');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Promote and Leave' }));

    expect(await within(dialog).findByRole('alert')).toBeVisible();
    expect(graphqlRequest).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not leave when the promotion is refused', async () => {
    graphqlRequest.mockRejectedValueOnce(new Error('Forbidden'));
    const dialog = await openDialog();
    choose(dialog, 'Fixture B');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Promote and Leave' }));

    expect(await within(dialog).findByRole('alert')).toBeVisible();
    expect(graphqlRequest).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('swaps the confirm for Delete once chosen, routing it into its own confirmation and deleting nothing from the dialog', async () => {
    graphqlRequest.mockResolvedValue({ deleteWorkspace: true });
    const dialog = await openDialog();
    expect(within(dialog).queryByRole('button', { name: 'Delete Coven' })).toBeNull();

    fireEvent.click(deleteIt(dialog));
    expect(within(dialog).queryByRole('button', { name: 'Promote and Leave' })).toBeNull();
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Coven' }));

    const confirmation = await screen.findByRole('group', { name: /Delete Fixture Coven/ });
    expect(graphqlRequest).not.toHaveBeenCalled();

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete Coven' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(graphqlRequest.mock.calls[0][1]).toEqual({ workspaceId: ID });
  });

  it('offers the deletion alone when there is no one to hand it to', async () => {
    const dialog = await openDialog([]);

    expect(within(dialog).queryByRole('radio')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Promote and Leave' })).toBeNull();
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Delete Coven' })).toBeEnabled();
  });

  it('closes on Cancel with nothing sent', async () => {
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(graphqlRequest).not.toHaveBeenCalled();
  });

  it.each([
    [
      'Cancel',
      (dialog: HTMLElement) =>
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })),
    ],
    [
      'Escape',
      (dialog: HTMLElement) => fireEvent(dialog, new Event('cancel', { cancelable: true })),
    ],
  ])('gives focus back to Leave Coven when the dialog closes by %s', async (_way, closeIt) => {
    const dialog = await openDialog();
    const leave = screen.getByRole('button', { name: 'Leave Coven' });
    expect(leave).not.toHaveFocus();

    closeIt(dialog);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(leave).toHaveFocus();
  });
});
