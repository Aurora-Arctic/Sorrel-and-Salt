import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InviteDialog from '@/components/InviteDialog';
import type { CreateInvitationMutation, CreateInvitationMutationVariables } from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The owner's invite dialog (M7.4): an address, a role of viewer or member,
// and a confirmation naming where the mail went. Render-and-send only: the
// service behind the mutation is M7.3's and is tested there
// (claude-docs/components/invite-dialog.md).

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const WORKSPACE = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  router.refresh.mockClear();
});

const trigger = () => screen.getByRole('button', { name: 'Invite' });
const dialog = () => screen.getByRole('dialog');
const emailField = () => within(dialog()).getByRole('textbox', { name: 'Email Address' });
const send = () => within(dialog()).getByRole('button', { name: 'Send Invitation' });

function open() {
  render(<InviteDialog workspaceId={WORKSPACE} />);
  fireEvent.click(trigger());
}

/** A tab close or reload as the browser raises it: true when something cancelled it. */
function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function type(address: string) {
  fireEvent.change(emailField(), { target: { value: address } });
}

/** Counts what the form sends, answering as the service does for an accepted invitation. */
function mockSending() {
  const calls: CreateInvitationMutationVariables[] = [];
  mockGraphQLMutation<CreateInvitationMutation, CreateInvitationMutationVariables>(
    'CreateInvitation',
    (variables) => {
      calls.push(variables);
      return { createInvitation: { id: 'i1' } };
    },
  );
  return calls;
}

/**
 * Nothing in the page to copy or follow: no link, no URL or token in the text
 * or in any field's value. The mail carries the only link there is.
 */
function expectNothingToCopy() {
  expect(screen.queryAllByRole('link')).toEqual([]);
  expect(document.body.innerHTML).not.toMatch(/https?:|\/invite\/|token/i);
  for (const field of document.querySelectorAll('input, textarea')) {
    expect((field as HTMLInputElement).value).not.toMatch(/https?:|\/invite\/|token/i);
  }
}

describe('InviteDialog', () => {
  it('is shut until Invite is pressed, and opens a dialog over the page', async () => {
    render(<InviteDialog workspaceId={WORKSPACE} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger());

    expect(dialog()).toBeInTheDocument();
    await waitFor(() => expect(emailField()).toHaveFocus());
  });

  it('keeps Send off until an address is typed', () => {
    open();
    expect(send()).toBeDisabled();

    type('ada@example.test');

    expect(send()).toBeEnabled();
  });

  // The shape of an address is src/lib/email-address.ts's, proved in
  // tests/lib/email-address.test.ts; this is the form's wiring of it, through
  // a domain no mailbox can exist under.
  it('refuses an address the format rule rejects before anything is sent', async () => {
    const calls = mockSending();
    open();

    type('ada@example.invalid');
    fireEvent.click(send());

    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
    expect(emailField()).toHaveAccessibleDescription(/\S/);
    expect(calls).toEqual([]);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('clears the refusal as the address is changed', async () => {
    mockSending();
    open();
    type('ada.example.test');
    fireEvent.click(send());
    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));

    type('ada@example.test');

    expect(emailField()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('offers a viewer and a member, never an owner, starting on the viewer', () => {
    open();

    const roles = within(dialog()).getByRole('group', { name: 'Role' });
    const radios = within(roles).getAllByRole('radio');
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(['viewer', 'member']);
    expect(within(roles).getByRole('radio', { name: /Viewer/ })).toBeChecked();
    expect(within(dialog()).queryByRole('radio', { name: /Owner/ })).toBeNull();
    expect(within(dialog()).queryByRole('option', { name: /Owner/ })).toBeNull();
  });

  it('sends the address, trimmed, with the chosen role for this coven, then says so and refreshes the page behind it', async () => {
    const calls = mockSending();
    open();

    type('  ada@example.test ');
    fireEvent.click(within(dialog()).getByRole('radio', { name: /Member/ }));
    fireEvent.click(send());

    const sent = await screen.findByRole('status');
    expect(calls).toEqual([{ workspaceId: WORKSPACE, email: 'ada@example.test', role: 'member' }]);
    expect(sent).toHaveTextContent('ada@example.test');
    expect(router.refresh).toHaveBeenCalledTimes(1);
    // The form is replaced by the confirmation, so nothing can be sent twice.
    expect(within(dialog()).queryByRole('textbox', { name: 'Email Address' })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Send Invitation' })).toBeNull();
  });

  it('shows no link, URL or token at any point: open, sending, sent or refused', async () => {
    mockSending();
    open();
    expectNothingToCopy();

    type('ada@example.test');
    expectNothingToCopy();
    fireEvent.click(send());
    expectNothingToCopy();

    await screen.findByRole('status');
    expectNothingToCopy();
  });

  it('shows no link after a refusal either', async () => {
    mockGraphQLError('CreateInvitation', { code: 'FORBIDDEN', message: 'Forbidden' });
    open();

    type('ada@example.test');
    fireEvent.click(send());

    await screen.findByRole('alert');
    expectNothingToCopy();
  });

  it('closes from Done and gives the focus back to Invite', async () => {
    mockSending();
    open();
    type('ada@example.test');
    fireEvent.click(send());
    await screen.findByRole('status');

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  // The guard's own shape is tests/components/Modal's; this is its wiring here.
  // A navigation from inside a modal goes unheld (tests/components/Modal/discard.test.tsx),
  // so the leave guard here is the tab close and reload (M13.14).
  it('asks before Cancel, Escape or a tab close discards what was typed, and closes on Discard Changes', async () => {
    open();
    expect(unload()).toBe(false);
    type('ada@example.test');
    expect(unload()).toBe(true);
    const discard = () => screen.queryByRole('button', { name: 'Discard Changes' });

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(discard()).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));
    expect(emailField()).toHaveValue('ada@example.test');
    fireEvent(dialog(), new Event('cancel', { cancelable: true }));
    expect(discard()).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger()).toHaveFocus();
    expect(unload()).toBe(false);
  });

  it('opens blank again after an invitation was sent', async () => {
    mockSending();
    open();
    type('ada@example.test');
    fireEvent.click(send());
    await screen.findByRole('status');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(trigger());

    expect(emailField()).toHaveValue('');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says an address the service refuses beside the field and keeps the form open', async () => {
    mockGraphQLError('CreateInvitation', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['email'], message: 'That person is in this coven already' }],
    });
    open();

    type('ada@example.test');
    fireEvent.click(send());

    await waitFor(() => expect(emailField()).toHaveAttribute('aria-invalid', 'true'));
    expect(emailField()).toHaveAccessibleDescription('That person is in this coven already');
    expect(send()).toBeEnabled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('says any other refusal in an alert and keeps what was typed', async () => {
    mockGraphQLError('CreateInvitation', { code: 'FORBIDDEN', message: 'Forbidden' });
    open();

    type('ada@example.test');
    fireEvent.click(send());

    await screen.findByRole('alert');
    expect(emailField()).toHaveValue('ada@example.test');
    expect(screen.queryByRole('status')).toBeNull();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
