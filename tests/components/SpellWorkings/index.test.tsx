import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpellWorkings from '@/components/SpellWorkings';
import EditWorkingAction from '@/components/SpellWorkings/edit-working';
import type { SpellWorkingsProps, WorkingView } from '@/components/SpellWorkings/types';
import type { DeleteWorkingMutation, DeleteWorkingMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { answer } from '../../support/discard-guard';
import { press } from '../../support/interact';
import { mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The recipe page's Workings section: each working as a row, in the order given, with who
// worked it, the deductions of a complete one, and Delete Working only for its recorder.

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

const working = (over: Partial<WorkingView> & Pick<WorkingView, 'id'>): WorkingView => ({
  status: 'complete',
  visibility: 'workspace',
  workedOn: '2026-03-04',
  note: null,
  recordedBy: 'Fixture A',
  participants: ['Fixture A'],
  deductions: [],
  canChange: false,
  ...over,
});

function renderSection(
  workings: WorkingView[],
  complete?: SpellWorkingsProps['completeAction'],
  edit?: SpellWorkingsProps['editAction'],
  headingAction?: React.ReactNode,
) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellWorkings
        workspaceId={WORKSPACE_ID}
        workings={workings}
        completeAction={complete}
        editAction={edit}
        headingAction={headingAction}
      />
    </QueryClientProvider>,
  );
}

const rows = () => within(screen.getByRole('list', { name: 'Workings' })).getAllByRole('listitem');

describe('SpellWorkings', () => {
  beforeEach(() => router.refresh.mockClear());

  it('says so when the spell has no workings, and draws no list', () => {
    renderSection([]);
    expect(screen.getByRole('heading', { name: 'Workings' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Workings' })).not.toBeInTheDocument();
  });

  it('draws the heading action in the Workings section, whether or not it has rows, and nothing without one', () => {
    const action = <button type="button">Record a Working</button>;
    const { unmount } = renderSection([], undefined, undefined, action);
    const section = screen.getByRole('region', { name: 'Workings' });
    expect(within(section).getByRole('button', { name: 'Record a Working' })).toBeInTheDocument();
    unmount();
    const second = renderSection([working({ id: 'w1' })], undefined, undefined, action);
    expect(
      within(screen.getByRole('region', { name: 'Workings' })).getByRole('button', {
        name: 'Record a Working',
      }),
    ).toBeInTheDocument();
    second.unmount();
    renderSection([working({ id: 'w1' })]);
    expect(screen.queryByRole('button', { name: 'Record a Working' })).not.toBeInTheDocument();
  });

  it('draws a row per working with its date, participants, note, status and visibility, in order', () => {
    renderSection([
      working({
        id: 'w1',
        status: 'draft',
        visibility: 'private',
        note: 'Under a full moon',
        participants: ['Fixture A', 'Fixture B'],
      }),
      working({ id: 'w2', workedOn: '2026-02-01' }),
    ]);
    const [first, second] = rows();
    expect(first).toHaveTextContent('4 March 2026');
    expect(first).toHaveTextContent('Fixture A, Fixture B');
    expect(first).toHaveTextContent('Under a full moon');
    expect(first).toHaveTextContent('Draft');
    expect(first).toHaveTextContent('Private');
    expect(second).toHaveTextContent('1 February 2026');
    expect(second).not.toHaveTextContent('Draft');
  });

  it("lists a complete working's deductions, one line per ingredient step", () => {
    renderSection([
      working({
        id: 'w1',
        deductions: [{ id: 'd1', name: 'Testwort (Dried Leaf)', quantity: '2', unit: 'g' }],
      }),
    ]);
    const lines = within(within(rows()[0]!).getByRole('list', { name: 'Deductions' })).getAllByRole(
      'listitem',
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent('Testwort (Dried Leaf)');
    expect(lines[0]).toHaveTextContent('2');
    expect(lines[0]).toHaveTextContent('g');
    // The lines carry no step number: the spell, not the working, says where a step stands.
    expect(lines[0]).toHaveTextContent(/^Testwort/);
  });

  it('says on a draft row what completing it would skip, and on no complete row', () => {
    renderSection([
      working({
        id: 'w1',
        status: 'draft',
        warnings: ['Completing does not affect inventory for 2 items'],
      }),
      working({ id: 'w2', warnings: ['Completing does not affect inventory for 1 item'] }),
    ]);
    expect(
      within(rows()[0]!).getByText('Completing does not affect inventory for 2 items'),
    ).toBeVisible();
    expect(
      screen.queryByText(/Completing does not affect inventory for 1 item/),
    ).not.toBeInTheDocument();
  });

  it("offers Complete on the recorder's own draft row only, in the slot the page fills", () => {
    const own: WorkingView['editable'] = {
      id: 'w1',
      workedOn: '2026-03-04',
      note: null,
      visibility: 'workspace',
      status: 'draft',
      participants: [],
    };
    renderSection(
      [
        working({ id: 'w1', status: 'draft', editable: own }),
        working({ id: 'w2' }),
        // Another member's draft: only its recorder may complete it.
        working({ id: 'w3', status: 'draft' }),
      ],
      (id) => <button type="button">Complete {id}</button>,
    );
    expect(screen.getAllByRole('button', { name: /^Complete / })).toHaveLength(1);
    expect(within(rows()[0]!).getByRole('button', { name: 'Complete w1' })).toBeInTheDocument();
  });

  it('hands Complete the day it names, so two drafts have two different Complete buttons', () => {
    const own = (id: string, workedOn: string): WorkingView['editable'] => ({
      id,
      workedOn,
      note: null,
      visibility: 'workspace',
      status: 'draft',
      participants: [],
    });
    renderSection(
      [
        working({
          id: 'w1',
          status: 'draft',
          workedOn: '2026-03-04',
          editable: own('w1', '2026-03-04'),
        }),
        working({
          id: 'w2',
          status: 'draft',
          workedOn: '2026-03-01',
          editable: own('w2', '2026-03-01'),
        }),
      ],
      (_id, _workedOn, name) => <button type="button">Complete Working {name}</button>,
    );
    expect(
      within(rows()[0]!).getByRole('button', { name: 'Complete Working 4 March 2026' }),
    ).toBeInTheDocument();
    expect(
      within(rows()[1]!).getByRole('button', { name: 'Complete Working 1 March 2026' }),
    ).toBeInTheDocument();
  });

  it("takes the Edit pencil's ink from the text only on a row that shows Complete", () => {
    const editable = (id: string, status: 'draft' | 'complete'): WorkingView['editable'] => ({
      id,
      workedOn: '2026-03-04',
      note: null,
      visibility: 'workspace',
      status,
      participants: [],
    });
    renderSection(
      [
        working({ id: 'w1', status: 'draft', editable: editable('w1', 'draft') }),
        working({ id: 'w2', editable: editable('w2', 'complete') }),
      ],
      (id) => <button type="button">Complete {id}</button>,
      (working, name, plain) => (
        <EditWorkingAction
          name={name}
          plain={plain}
          workspaceId={WORKSPACE_ID}
          spellId="s1"
          spellVisibility="workspace"
          members={[]}
          steps={[]}
          working={working}
        />
      ),
    );
    const edit = (row: HTMLElement) => within(row).getByRole('button', { name: /^Edit Working/ });
    expect(within(rows()[0]!).getByRole('button', { name: 'Complete w1' })).toBeInTheDocument();
    expect(edit(rows()[0]!)).toHaveClass('icon-tip__edit--plain');
    expect(within(rows()[1]!).queryByRole('button', { name: /^Complete / })).toBeNull();
    expect(edit(rows()[1]!)).not.toHaveClass('icon-tip__edit--plain');
  });

  it('draws Delete Working only for a working its viewer may change, and deletes it after a confirmation', async () => {
    const calls: DeleteWorkingMutationVariables[] = [];
    mockGraphQLMutation<DeleteWorkingMutation, DeleteWorkingMutationVariables>(
      'DeleteWorking',
      (variables) => {
        calls.push(variables);
        return { deleteWorking: String(variables.id) };
      },
    );
    renderSection([working({ id: 'w1', canChange: true }), working({ id: 'w2' })]);
    expect(screen.getAllByRole('button', { name: /^Delete Working/ })).toHaveLength(1);
    press(screen.getByRole('button', { name: /^Delete Working/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Working' });
    // The dialog names the working, then says in one sentence that the stock it took is not given back.
    expect(dialog).toHaveTextContent(
      /Delete the working of .+\? It leaves the spell’s history and count, and what it took from the jars stays taken\./,
    );
    expect(calls).toHaveLength(0);
    press(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls).toEqual([{ id: 'w1', workspaceId: WORKSPACE_ID }]));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });
});

describe('Delete Working in the Edit dialog', () => {
  const editable: WorkingView['editable'] = {
    id: 'w1',
    workedOn: '2026-03-04',
    note: null,
    visibility: 'workspace',
    status: 'complete',
    participants: [],
  };
  const bin = async () =>
    within(await screen.findByRole('dialog', { name: 'Edit Working' })).queryByRole('button', {
      name: /^Delete Working/,
    });
  function renderEditable(canChange: boolean) {
    renderSection(
      [working({ id: 'w1', canChange, editable })],
      undefined,
      (working, name, plain, canDelete) => (
        <EditWorkingAction
          name={name}
          plain={plain}
          canDelete={canDelete}
          workspaceId={WORKSPACE_ID}
          spellId="s1"
          spellVisibility="workspace"
          members={[]}
          steps={[]}
          working={working}
        />
      ),
    );
    press(screen.getByRole('button', { name: /^Edit Working/ }));
  }

  it('is drawn for a viewer who may delete the working', async () => {
    renderEditable(true);
    expect(await bin()).toBeInTheDocument();
  });

  it('is not drawn for a viewer who may only edit the working', async () => {
    renderEditable(false);
    expect(await bin()).toBeNull();
  });

  it('asks first, then deletes the working and closes the dialog', async () => {
    const calls: DeleteWorkingMutationVariables[] = [];
    mockGraphQLMutation<DeleteWorkingMutation, DeleteWorkingMutationVariables>(
      'DeleteWorking',
      (variables) => {
        calls.push(variables);
        return { deleteWorking: String(variables.id) };
      },
    );
    renderEditable(true);
    press((await bin())!);
    const question = (await waitFor(() => answer('Cancel'))).closest('fieldset')!;
    expect(question).toHaveTextContent(/stays taken/);
    expect(calls).toHaveLength(0);
    press(within(question).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls).toEqual([{ id: 'w1', workspaceId: WORKSPACE_ID }]));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Working' })).toBeNull());
    expect(router.refresh).toHaveBeenCalled();
  });
});
