import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecordWorkingButton, { RecordWorkingDialog } from '@/components/RecordWorking';
import type {
  RecordWorkingMutation,
  RecordWorkingMutationVariables,
  UpdateWorkingMutation,
  UpdateWorkingMutationVariables,
  WorkingDeductionPreviewQuery,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The Record a Working dialog: a draft saved from a complete spell's page, or an existing working
// changed (claude-docs/components/record-working.md).

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
const MEMBERS = [
  { userId: 'u1', name: 'Testa Owner' },
  { userId: 'u2', name: 'Mocka Member' },
];
const STEPS = [{ id: 's1', name: 'Testwort' }];

beforeEach(() => router.refresh.mockClear());

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
        spellVisibility={visibility}
        members={MEMBERS}
        steps={STEPS}
      />,
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Record a Working' }));
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
        participants: [{ userId: 'u2' }],
      },
    });
    expect(calls[0]?.input.workedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(router.refresh).toHaveBeenCalled();
  });

  it('saves, then shows the deduction preview, from Save & Complete', async () => {
    const calls = mockRecording();
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save & Complete' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(await screen.findByRole('list', { name: 'Deductions' })).toHaveTextContent('Testwort');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('cannot date a working in the future', () => {
    openButton();
    const max = within(dialog()).getByLabelText(/Date/).getAttribute('max');
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(max).toBe(new Date().toLocaleDateString('en-CA'));
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
    expect(calls[0]?.input.participants).toEqual([{ name: 'Guest Witness' }]);
  });

  it('leaves the participants out when none are named, so the recorder is the one taking part', async () => {
    const calls = mockRecording();
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Working' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).not.toHaveProperty('participants');
  });

  it('offers only private on a private spell', () => {
    openButton('private');
    expect(within(dialog()).getByRole('radio', { name: /Private/ })).toBeChecked();
    expect(within(dialog()).queryByRole('radio', { name: /Coven/ })).toBeNull();
  });

  it('asks before closing with changes, and closes quietly without any', () => {
    openButton();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record a Working' }));
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
          members={MEMBERS}
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

  it('keeps a shared complete working shared', () => {
    render(
      wrap(
        <RecordWorkingDialog
          workspaceId={WORKSPACE}
          spellId={SPELL}
          spellVisibility="workspace"
          members={MEMBERS}
          steps={STEPS}
          working={{ ...working, status: 'complete', visibility: 'workspace' }}
          onClose={() => {}}
        />,
      ),
    );
    expect(within(dialog()).queryByRole('radio', { name: /Private/ })).toBeNull();
    expect(within(dialog()).queryByRole('button', { name: 'Save & Complete' })).toBeNull();
  });
});
