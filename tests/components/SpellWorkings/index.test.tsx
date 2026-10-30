import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpellWorkings from '@/components/SpellWorkings';
import type { WorkingView } from '@/components/SpellWorkings/types';
import type { DeleteWorkingMutation, DeleteWorkingMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
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

function renderSection(workings: WorkingView[], complete?: (id: string) => React.ReactNode) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellWorkings workspaceId={WORKSPACE_ID} workings={workings} completeAction={complete} />
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
      working({ id: 'w1', status: 'draft', warnings: ['Completing skips 2 steps'] }),
      working({ id: 'w2', warnings: ['Completing skips 1 step'] }),
    ]);
    expect(within(rows()[0]!).getByText('Completing skips 2 steps')).toBeVisible();
    expect(screen.queryByText(/Completing skips 1 step/)).not.toBeInTheDocument();
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
    // The dialog says the stock the working took is not given back.
    expect(dialog).toHaveTextContent(/stays taken/);
    expect(calls).toHaveLength(0);
    press(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls).toEqual([{ id: 'w1', workspaceId: WORKSPACE_ID }]));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });
});
