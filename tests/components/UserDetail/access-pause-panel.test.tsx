import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from '@/components/Modal';
import UserDetail from '@/components/UserDetail';
import type { AccessPauseEntry, UserDetailProps } from '@/components/UserDetail/types';
import type {
  LiftUserAccessPauseMutation,
  LiftUserAccessPauseMutationVariables,
  PauseUserAccessMutation,
  PauseUserAccessMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLMutation } from '../../support/msw/graphql';

// claude-docs/components/user-detail.md, "Contracts"

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  router.refresh.mockReset();
});

const BO = {
  id: '7a2b3c4d-5e6f-4a1b-9c8d-7e6f5a4b3c2d',
  name: 'Bo Fixturewort',
  email: 'bo@fixture.test',
  emailVerified: true,
  role: 'user' as const,
  primaryAdmin: false,
  canCreateWorkspace: false,
  providers: [],
  createdAt: new Date('2026-02-03T04:05:06Z'),
  agreedTermsVersion: 1,
  agreedDisclaimerVersion: 1,
  agreedEthicsVersion: 1,
};
const ASH = { id: 'a1', name: 'Ash Warden' };
const IVY = { id: 'a2', name: 'Ivy Keeper' };

const pause = (overrides: Partial<AccessPauseEntry>): AccessPauseEntry => ({
  id: 'p1',
  until: null,
  note: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  liftedAt: null,
  setBy: ASH,
  liftedBy: null,
  ...overrides,
});

const renderDetail = (overrides: Partial<UserDetailProps> = {}) =>
  render(
    <Modal title="Bo Fixturewort" onClose={vi.fn()}>
      <UserDetail user={BO} memberships={[]} {...overrides} />
    </Modal>,
  );

const section = () => screen.getByRole('region', { name: 'Site Access' });
const unfold = () =>
  fireEvent.click(within(section()).getByRole('button', { name: 'Site Access', expanded: false }));

const pausesSent = (): PauseUserAccessMutationVariables[] => {
  const sent: PauseUserAccessMutationVariables[] = [];
  mockGraphQLMutation<PauseUserAccessMutation, PauseUserAccessMutationVariables>(
    'PauseUserAccess',
    (variables) => {
      sent.push(variables);
      return { pauseUserAccess: { __typename: 'UserAccessPause', id: 'p9' } };
    },
  );
  return sent;
};

const writeNote = () =>
  fireEvent.change(within(section()).getByRole('textbox', { name: 'Note' }), {
    target: { value: 'Shared password' },
  });

const MESSAGE = 'Your access is paused for a week.';
const writeMessage = (message = MESSAGE) =>
  fireEvent.change(within(section()).getByRole('textbox', { name: /^Message to User/ }), {
    target: { value: message },
  });

describe('UserDetail, Site Access', () => {
  it('draws no Site Access section when no pauses are given, as for the primary keeper and the admin’s own account', () => {
    renderDetail();
    expect(screen.queryByRole('region', { name: 'Site Access' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause Access' })).toBeNull();
  });

  it('sets a dated pause with a trimmed note, sending nothing until confirmed', async () => {
    const sent = pausesSent();
    renderDetail({ pauses: [] });
    unfold();
    fireEvent.change(within(section()).getByRole('combobox', { name: 'For' }), {
      target: { value: 'week' },
    });
    fireEvent.change(within(section()).getByRole('textbox', { name: 'Note' }), {
      target: { value: '  Shared password  ' },
    });
    writeMessage();
    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    expect(sent).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ userId: BO.id, note: 'Shared password' });
    const ahead = new Date(sent[0]?.until as string).getTime() - Date.now();
    expect(ahead).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60_000);
    expect(ahead).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });

  it('sets an open-ended pause, sending no end', async () => {
    const sent = pausesSent();
    renderDetail({ pauses: [] });
    unfold();
    fireEvent.change(within(section()).getByRole('combobox', { name: 'For' }), {
      target: { value: 'none' },
    });
    writeNote();
    writeMessage();
    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([
      { userId: BO.id, until: null, note: 'Shared password', message: MESSAGE },
    ]);
  });

  it('offers a required Message to User, said to be emailed to them, beside a note said to be seen by staff only', () => {
    renderDetail({ pauses: [] });
    unfold();

    const message = within(section()).getByRole('textbox', { name: /^Message to User/ });
    expect(message).toBeRequired();
    expect(message).toHaveAccessibleDescription(/email/i);
    expect(within(section()).getByRole('textbox', { name: 'Note' })).toHaveAccessibleDescription(
      /Seen by staff only/,
    );
  });

  it('counts the note and the message against 500 characters without cutting what is typed', () => {
    renderDetail({ pauses: [] });
    unfold();

    for (const name of ['Note', /^Message to User/]) {
      const field = within(section()).getByRole('textbox', { name });
      fireEvent.change(field, { target: { value: 'x'.repeat(503) } });
      expect(field).toHaveValue('x'.repeat(503));
      expect(field).toHaveAccessibleDescription(/3 characters over/);
    }
  });

  it('holds Pause Access, and sends nothing, until the message has text', () => {
    const sent = pausesSent();
    renderDetail({ pauses: [] });
    unfold();
    writeNote();
    const pauseButton = within(section()).getByRole('button', { name: 'Pause Access' });

    expect(pauseButton).toBeDisabled();
    writeMessage('   ');
    expect(pauseButton).toBeDisabled();
    fireEvent.click(pauseButton);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(sent).toHaveLength(0);

    // Why it could have been sent: with a message written, the same form is ready.
    writeMessage();
    expect(pauseButton).toBeEnabled();
  });

  it('sends the message to the user, trimmed, with the pause', async () => {
    const sent = pausesSent();
    renderDetail({ pauses: [] });
    unfold();
    writeNote();
    writeMessage('  Paused while we look into a report.  ');
    fireEvent.click(within(section()).getByRole('button', { name: 'Pause Access' }));
    // Precondition: nothing goes before the confirmation.
    expect(sent).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      userId: BO.id,
      note: 'Shared password',
      message: 'Paused while we look into a report.',
    });
  });

  it.each([['day'], ['none']])(
    'marks the note required and holds Pause Access until it has text, for a %s pause',
    (span) => {
      renderDetail({ pauses: [] });
      unfold();
      fireEvent.change(within(section()).getByRole('combobox', { name: 'For' }), {
        target: { value: span },
      });
      writeMessage();
      const note = within(section()).getByRole('textbox', { name: 'Note' });
      const pauseButton = within(section()).getByRole('button', { name: 'Pause Access' });
      expect(note).toBeRequired();
      expect(pauseButton).toBeDisabled();
      fireEvent.change(note, { target: { value: '   ' } });
      expect(pauseButton).toBeDisabled();
      fireEvent.change(note, { target: { value: 'Shared password' } });
      expect(pauseButton).toBeEnabled();
    },
  );

  it('holds Pause Access until a date is picked, when the pause runs until a date', () => {
    renderDetail({ pauses: [] });
    unfold();
    writeNote();
    writeMessage();
    const pauseButton = within(section()).getByRole('button', { name: 'Pause Access' });
    expect(pauseButton).toBeEnabled();
    fireEvent.change(within(section()).getByRole('combobox', { name: 'For' }), {
      target: { value: 'date' },
    });
    expect(pauseButton).toBeDisabled();
  });

  it('shows a standing pause with Lift Pause in place of the form, and lifts it once confirmed', async () => {
    const sent: LiftUserAccessPauseMutationVariables[] = [];
    mockGraphQLMutation<LiftUserAccessPauseMutation, LiftUserAccessPauseMutationVariables>(
      'LiftUserAccessPause',
      (variables) => {
        sent.push(variables);
        return { liftUserAccessPause: { __typename: 'UserAccessPause', id: 'p1' } };
      },
    );
    renderDetail({ pauses: [pause({ note: 'Shared password' })] });
    unfold();

    expect(within(section()).queryByRole('button', { name: 'Pause Access' })).toBeNull();
    expect(within(section()).queryByRole('combobox', { name: 'For' })).toBeNull();
    fireEvent.click(within(section()).getByRole('button', { name: 'Lift Pause' }));
    expect(sent).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Lift' }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([{ userId: BO.id }]);
  });

  it('lists lifted and run-out pauses as earlier ones, naming who set and who lifted each, and offers the form again', () => {
    renderDetail({
      pauses: [
        pause({
          id: 'p2',
          until: new Date('2026-09-20T00:00:00Z'),
          createdAt: new Date('2026-09-10T00:00:00Z'),
        }),
        pause({ id: 'p1', setBy: IVY, liftedAt: new Date('2026-08-02T00:00:00Z'), liftedBy: ASH }),
      ],
    });
    unfold();

    expect(within(section()).getByRole('button', { name: 'Pause Access' })).toBeInTheDocument();
    const items = within(
      within(section()).getByRole('list', { name: 'Earlier Pauses' }),
    ).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0] as HTMLElement).getByText(/Set by Ash Warden/)).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).queryByText(/Lifted by/)).toBeNull();
    expect(
      within(items[1] as HTMLElement).getByText(/Set by Ivy Keeper · Lifted by Ash Warden/),
    ).toBeInTheDocument();
  });
});
