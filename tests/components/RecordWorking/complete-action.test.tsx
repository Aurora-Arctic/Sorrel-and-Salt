import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompleteWorkingAction from '@/components/RecordWorking/complete-action';
import type {
  CompleteWorkingMutation,
  CompleteWorkingMutationVariables,
  WorkingDeductionPreviewQuery,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Complete on a working's row: the preview first, then Confirm
// (claude-docs/components/record-working.md).

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
const WORKING = '00000000-0000-4000-8000-000000000003';
const STEPS = [
  { id: 's1', name: 'Testwort' },
  { id: 's2', name: 'Mockroot' },
  { id: 's3', name: 'Fixtureleaf' },
];
const WARNINGS = [
  { position: 2, reason: 'UNITS_DIFFER' as const, stepId: 's2', stepName: 'Mockroot' },
];

function open() {
  mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => ({
    workingDeductionPreview: {
      deductions: [
        { inventoryItemId: 'i1', quantity: 2, shortfall: 0, stepId: 's1', unit: 'g' },
        { inventoryItemId: 'i3', quantity: 5, shortfall: 1.5, stepId: 's3', unit: 'ml' },
      ],
      warnings: WARNINGS,
    },
  }));
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CompleteWorkingAction
        workspaceId={WORKSPACE}
        spellId={SPELL}
        workingId={WORKING}
        steps={STEPS}
      />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
}

describe('Complete on a working', () => {
  it('lists each step with what is taken, the shortfall, or why nothing is', async () => {
    open();
    const list = await screen.findByRole('list', { name: 'Deductions' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Testwort 2 g');
    expect(rows[1]).toHaveTextContent('Mockroot Not deducted: units differ');
    expect(rows[2]).toHaveTextContent('Fixtureleaf 5 ml');
    expect(rows[2]).toHaveTextContent('short by 1.5 ml');
  });

  it('takes nothing until Confirm, then completes the working and reads the page again', async () => {
    const calls: CompleteWorkingMutationVariables[] = [];
    mockGraphQLMutation<CompleteWorkingMutation, CompleteWorkingMutationVariables>(
      'CompleteWorking',
      (variables) => {
        calls.push(variables);
        return {
          completeWorking: {
            working: { id: WORKING, status: 'complete', completedAt: '2026-10-30T00:00:00Z' },
            warnings: WARNINGS,
          },
        } as CompleteWorkingMutation;
      },
    );
    open();
    await screen.findByRole('list', { name: 'Deductions' });
    expect(calls).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(calls).toEqual([{ workspaceId: WORKSPACE, id: WORKING }]));
    expect(await screen.findByRole('button', { name: 'Done' })).toBeVisible();
    expect(router.refresh).toHaveBeenCalled();
  });
});
