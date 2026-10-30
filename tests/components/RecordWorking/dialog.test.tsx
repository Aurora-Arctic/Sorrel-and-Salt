import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecordWorkingButton, { RecordWorkingDialog } from '@/components/RecordWorking';
import type {
  RecordWorkingMembersQuery,
  RecordWorkingMembersQueryVariables,
  RecordWorkingMutation,
  RecordWorkingMutationVariables,
  UpdateWorkingMutation,
  UpdateWorkingMutationVariables,
  WorkingDeductionPreviewQuery,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { HttpResponse } from 'msw';
import {
  graphqlLink,
  mockGraphQLError,
  mockGraphQLMutation,
  mockGraphQLQuery,
} from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The Record a Working dialog: a draft saved from a complete spell's page, or an existing working
// changed (claude-docs/components/record-working.md).

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
// The coven's members as the server holds them: the box searches them as the user types.
const MEMBERS = [
  { id: 'u1', name: 'Testa Owner' },
  { id: 'u2', name: 'Mocka Member' },
];
const RECORDER = { userId: 'u1', name: 'Testa Owner' };
const STEPS = [{ id: 's1', name: 'Testwort' }];

/** Answers the participant box's search as the server does, with the members whose name holds the text. */
function mockMembers(users: readonly { id: string; name: string | null }[] = MEMBERS) {
  const asked: RecordWorkingMembersQueryVariables[] = [];
  mockGraphQLQuery<RecordWorkingMembersQuery, RecordWorkingMembersQueryVariables>(
    'RecordWorkingMembers',
    (variables) => {
      asked.push(variables);
      const text = (variables.query ?? '').toLowerCase();
      const edges = users
        .filter(({ name }) => name === null || name.toLowerCase().includes(text))
        .map((user) => ({ node: { user } }));
      return { workspace: { id: WORKSPACE, members: { edges } } } as RecordWorkingMembersQuery;
    },
  );
  return asked;
}

beforeEach(() => {
  router.refresh.mockClear();
  mockMembers();
});

const dialog = () => screen.getByRole('dialog');

function wrap(node: React.ReactNode) {
  return <QueryClientProvider client={makeQueryClient()}>{node}</QueryClientProvider>;
}

function mockRecording() {
  const calls: RecordWorkingMutationVariables[] = [];
  mockGraphQLMutation<RecordWorkingMutation, RecordWorkingMutationVariables>(
    'RecordWorking',
    (variables) => {
      calls.push(variables);
      return {
        recordWorking: {
          id: 'w1',
          status: 'draft',
          note: null,
          workedOn: variables.input.workedOn,
          visibility: variables.input.visibility ?? 'private',
          participants: [{ id: 'p1', name: 'Mocka Member', userId: 'u2' }],
        },
      } as RecordWorkingMutation;
    },
  );
  mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => ({
    workingDeductionPreview: {
      deductions: [],
      warnings: [{ position: 1, reason: 'UNSTOCKED', stepId: 's1', stepName: 'Testwort' }],
    },
  }));
  return calls;
}

function openButton(visibility: 'private' | 'workspace' = 'workspace') {
  render(
    wrap(
      <RecordWorkingButton
        workspaceId={WORKSPACE}
        spellId={SPELL}
        spellName="Testwort Tonic"
        spellVisibility={visibility}
        recorder={RECORDER}
        steps={STEPS}
      />,
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Record a Working of Testwort Tonic' }));
}

describe('Record a Working', () => {
  it('saves a draft naming a picked member, then closes and refreshes the page', async () => {
    const calls = mockRecording();
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    fireEvent.change(people, { target: { value: 'Mocka' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Mocka Member' }));
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Under the new moon' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      workspaceId: WORKSPACE,
      spellId: SPELL,
      input: {
        note: 'Under the new moon',
        visibility: 'workspace',
        participants: [{ userId: 'u1' }, { userId: 'u2' }],
      },
    });
    expect(calls[0]?.input.workedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.refresh).toHaveBeenCalled();
  });

  it('asks nothing of the server on opening, though the participant box takes the focus', async () => {
    const asked = mockMembers();
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    await waitFor(() => expect(people).toHaveFocus());
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(asked).toEqual([]);
  });

  it('searches the coven’s members once the typing settles, not on every key', async () => {
    const asked = mockMembers();
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    for (const value of ['M', 'Mo', 'Moc']) fireEvent.change(people, { target: { value } });
    expect(await screen.findByRole('option', { name: 'Mocka Member' })).toBeInTheDocument();
    expect(asked).toEqual([{ workspaceId: WORKSPACE, query: 'Moc', first: 10 }]);
  });

  it('leaves the members already taking part out of the matches', async () => {
    openButton();
    // Both names hold the letter, and the recorder already takes part.
    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'Participants' }), {
      target: { value: 'a' },
    });
    expect(await screen.findByRole('option', { name: 'Mocka Member' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Testa Owner' })).toBeNull();
  });

  it('calls a member the server cannot name a former member', async () => {
    mockMembers([{ id: 'u3', name: null }]);
    openButton();
    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'Participants' }), {
      target: { value: 'x' },
    });
    expect(await screen.findByRole('option', { name: 'A former member' })).toBeInTheDocument();
  });

  it('saves, then shows the deduction preview, from Complete', async () => {
    const calls = mockRecording();
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(await screen.findByRole('list', { name: 'Deductions' })).toHaveTextContent('Testwort');
    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
  });

  it('draws the loading skeleton while the deduction preview is read', async () => {
    const calls = mockRecording();
    let answer: () => void = () => {};
    server.use(
      graphqlLink.query(
        'WorkingDeductionPreview',
        () =>
          new Promise((resolve) => {
            answer = () =>
              resolve(
                HttpResponse.json({
                  data: { workingDeductionPreview: { deductions: [], warnings: [] } },
                }),
              );
          }),
      ),
    );
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(await within(dialog()).findByRole('status')).toHaveTextContent('Loading');
    expect(within(dialog()).queryByRole('list', { name: 'Deductions' })).toBeNull();
    answer();
    expect(await within(dialog()).findByRole('list', { name: 'Deductions' })).toBeInTheDocument();
  });

  it('shuts Participants with the other fields while the save is on its way, so no name is lost', async () => {
    let answer: () => void = () => {};
    server.use(
      graphqlLink.mutation('RecordWorking', ({ variables }) => {
        const workedOn = (variables as RecordWorkingMutationVariables).input.workedOn;
        return new Promise((resolve) => {
          answer = () =>
            resolve(
              HttpResponse.json({
                data: {
                  recordWorking: {
                    id: 'w1',
                    status: 'draft',
                    note: null,
                    workedOn,
                    visibility: 'workspace',
                    participants: [],
                  },
                },
              }),
            );
        });
      }),
    );
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    const removeRecorder = within(dialog()).getByRole('button', { name: /Remove.*Testa Owner/ });
    expect(people).toBeEnabled();
    expect(removeRecorder).toBeEnabled();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));

    await waitFor(() =>
      expect(within(dialog()).getByRole('textbox', { name: 'Note' })).toBeDisabled(),
    );
    expect(people).toBeDisabled();
    expect(removeRecorder).toBeDisabled();
    answer();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('describes Participants by the service’s refusal of a name', async () => {
    mockGraphQLError('RecordWorking', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['participants', 0], message: 'Choose a member of this coven' }],
    });
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    expect(people).not.toHaveAccessibleDescription();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));

    await waitFor(() => expect(people).toHaveAttribute('aria-invalid', 'true'));
    expect(people).toHaveAccessibleDescription('Choose a member of this coven');
  });

  it('adds a typed name as a chip and sends it as a name', async () => {
    const calls = mockRecording();
    openButton();
    const people = within(dialog()).getByRole('combobox', { name: 'Participants' });
    fireEvent.change(people, { target: { value: 'Guest Witness' } });
    fireEvent.keyDown(people, { key: 'Enter' });
    expect(
      await within(dialog()).findByRole('button', { name: /Remove.*Guest Witness/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.participants).toEqual([{ userId: 'u1' }, { name: 'Guest Witness' }]);
  });

  it('starts with the recorder as a participant, and sends them', async () => {
    const calls = mockRecording();
    openButton();
    expect(
      within(dialog()).getByRole('button', { name: /Remove.*Testa Owner/ }),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.participants).toEqual([{ userId: 'u1' }]);
  });

  it('keeps the recorder out when they are removed, rather than putting them back', async () => {
    const calls = mockRecording();
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: /Remove.*Testa Owner/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.participants).toEqual([]);
  });

  it('holds the share switch off and shut on a private spell', () => {
    openButton('private');
    const share = within(dialog()).getByRole('switch', { name: 'Share With the Coven' });
    expect(share).not.toBeChecked();
    expect(share).toBeDisabled();
  });

  it('shares with the coven by default on a shared spell, and goes private when switched off', async () => {
    const calls = mockRecording();
    openButton();
    const share = within(dialog()).getByRole('switch', { name: 'Share With the Coven' });
    expect(share).toBeChecked();
    expect(share).toBeEnabled();
    fireEvent.click(share);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input.visibility).toBe('private');
  });

  it('asks before closing with changes, and closes quietly without any', () => {
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record a Working of Testwort Tonic' }));
    fireEvent.change(within(dialog()).getByRole('textbox', { name: 'Note' }), {
      target: { value: 'x' },
    });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard Changes' })).toBeInTheDocument();
  });
});

describe('Edit Working', () => {
  const working = {
    id: 'w9',
    workedOn: '2026-10-01',
    note: 'First try',
    visibility: 'private' as const,
    status: 'draft' as const,
    participants: [{ userId: 'u1', name: 'Testa Owner' }],
  };

  it('changes the working it was given, rather than recording another', async () => {
    const calls: UpdateWorkingMutationVariables[] = [];
    mockGraphQLMutation<UpdateWorkingMutation, UpdateWorkingMutationVariables>(
      'UpdateWorking',
      (variables) => {
        calls.push(variables);
        return {
          updateWorking: {
            id: 'w9',
            status: 'draft',
            note: 'Second try',
            workedOn: '2026-10-01',
            visibility: 'private',
            participants: [],
          },
        } as UpdateWorkingMutation;
      },
    );
    const onClose = vi.fn();
    render(
      wrap(
        <RecordWorkingDialog
          workspaceId={WORKSPACE}
          spellId={SPELL}
          spellVisibility="workspace"
          steps={STEPS}
          working={working}
          onClose={onClose}
        />,
      ),
    );
    expect(screen.getByRole('dialog', { name: 'Edit Working' })).toBeInTheDocument();
    const note = within(dialog()).getByRole('textbox', { name: 'Note' });
    expect(note).toHaveValue('First try');
    expect(
      within(dialog()).getByRole('button', { name: /Remove.*Testa Owner/ }),
    ).toBeInTheDocument();
    fireEvent.change(note, { target: { value: 'Second try' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      workspaceId: WORKSPACE,
      id: 'w9',
      input: { note: 'Second try', participants: [{ userId: 'u1' }] },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('draws no Delete Working when recording a new working', () => {
    render(
      wrap(
        <RecordWorkingDialog
          workspaceId={WORKSPACE}
          spellId={SPELL}
          spellVisibility="workspace"
          steps={STEPS}
          deleteWorking={{ name: '1 October 2026', remove: () => Promise.resolve() }}
          onClose={() => {}}
        />,
      ),
    );
    expect(screen.getByRole('dialog', { name: 'Record a Working' })).toBeInTheDocument();
    expect(within(dialog()).queryByRole('button', { name: /^Delete Working/ })).toBeNull();
  });

  it.each([
    ['a future day', '2999-01-01', false],
    ['today', new Date().toLocaleDateString('en-CA'), true],
  ])('has Complete %s: enabled is %s', (_name, workedOn, enabled) => {
    render(
      wrap(
        <RecordWorkingDialog
          workspaceId={WORKSPACE}
          spellId={SPELL}
          spellVisibility="workspace"
          steps={STEPS}
          working={{ ...working, workedOn }}
          onClose={() => {}}
        />,
      ),
    );
    const complete = within(dialog()).getByRole('button', { name: 'Complete' });
    if (enabled) expect(complete).toBeEnabled();
    else expect(complete).toBeDisabled();
    // The reason is written under the buttons, where a keyboard or touch reader finds it without the tip.
    const reason = within(dialog()).queryByText('Complete on or after 1 January 2999');
    if (enabled) expect(reason).toBeNull();
    else {
      expect(reason).toBeVisible();
      expect(complete).toHaveAccessibleDescription('Complete on or after 1 January 2999');
    }
    // A draft dated ahead still saves.
    expect(within(dialog()).getByRole('button', { name: 'Save Working' })).toBeInTheDocument();
  });

  it('keeps a shared complete working shared', () => {
    render(
      wrap(
        <RecordWorkingDialog
          workspaceId={WORKSPACE}
          spellId={SPELL}
          spellVisibility="workspace"
          steps={STEPS}
          working={{ ...working, status: 'complete', visibility: 'workspace' }}
          onClose={() => {}}
        />,
      ),
    );
    const share = within(dialog()).getByRole('switch', { name: 'Share With the Coven' });
    expect(share).toBeChecked();
    expect(share).toBeDisabled();
    expect(within(dialog()).queryByRole('button', { name: 'Complete' })).toBeNull();
  });
});
