import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StockDialogProps } from '@/components/StockDialog/types';
import { describe, expect, it, vi } from 'vitest';
import CompleteWorkingAction from '@/components/RecordWorking/complete-action';
import type { WorkingStep } from '@/components/RecordWorking/types';
import type {
  CompleteWorkingMutation,
  CompleteWorkingMutationVariables,
  SaveStockMutation,
  SaveStockMutationVariables,
  WorkingDeductionPreviewQuery,
} from '@/gql/graphql';
import { press, typeIn } from '../../support/interact';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Complete on a working's row: the preview first, then Confirm
// (claude-docs/components/record-working.md).

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
const WORKING = '00000000-0000-4000-8000-000000000003';
const STOCK: StockDialogProps = {
  workspaceId: WORKSPACE,
  ingredientId: 'ing1',
  ingredientName: 'Testwort',
  forms: [{ variantId: 'v1', label: 'Leaf' }],
  jars: [{ id: 'i1', variantId: 'v1', quantity: 10, unit: 'g', threshold: 3 }],
  openOn: 'v1',
};
const STEPS = [
  { id: 's1', name: 'Testwort', form: 'leaf', seed: 'ing1' },
  { id: 's2', name: 'Mockroot', form: null, seed: 'ing2' },
  { id: 's3', name: 'Fixtureleaf', form: 'oil', seed: 'ing3' },
  { id: 's4', name: 'Oddment', form: null, seed: 'Oddment', oneOff: true },
];
const WARNINGS = [
  { position: 2, reason: 'UNITS_DIFFER' as const, stepId: 's2', stepName: 'Mockroot' },
];

const WARNINGS_ALL = [
  ...WARNINGS,
  { position: 5, reason: 'CUSTOM' as const, stepId: 's4', stepName: 'Oddment' },
];

function open(steps: readonly WorkingStep[] = STEPS) {
  mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => ({
    workingDeductionPreview: {
      deductions: [
        {
          inventoryItemId: 'i1',
          quantity: 2,
          shortfall: 0,
          stepId: 's1',
          unit: 'g',
          before: 10,
          lowStockThreshold: 3,
        },
        {
          inventoryItemId: 'i3',
          quantity: 5,
          shortfall: 1.5,
          stepId: 's3',
          unit: 'ml',
          before: 3.5,
          lowStockThreshold: null,
        },
      ],
      warnings: WARNINGS_ALL,
    },
  }));
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <CompleteWorkingAction
        workspaceId={WORKSPACE}
        spellId={SPELL}
        workingId={WORKING}
        steps={steps}
      />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
}

describe('Complete on a working', () => {
  it('lists each step by its name, with no step number, with what is taken, held and left, or why nothing is', async () => {
    open();
    const list = await screen.findByRole('list', { name: 'Deductions' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    // The line's name is the step's name alone: a number before it would stop this matching.
    for (const [i, name] of ['Testwort', 'Mockroot', 'Fixtureleaf', 'Oddment'].entries())
      expect(within(rows[i]!).getByText(name, { exact: true })).toBeVisible();
    expect(rows[0]).toHaveTextContent(/^Testwort/);
    expect(rows[0]).toHaveTextContent('takes 2 g · have 10 g · left 8 g');
    expect(rows[1]).toHaveTextContent(/^Mockroot/);
    expect(rows[1]).toHaveTextContent('units differ · takes nothing');
    expect(rows[2]).toHaveTextContent(/^Fixtureleaf/);
    expect(rows[2]).toHaveTextContent('takes 5 ml · have 3.5 ml · left 0 ml');
    expect(rows[2]).toHaveTextContent('short by 1.5 ml');
    expect(rows[3]).toHaveTextContent(/^Oddment/);
    expect(rows[3]).toHaveTextContent('one-off · not kept');
  });

  it('says a form with no jar has none', async () => {
    mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => ({
      workingDeductionPreview: {
        deductions: [],
        warnings: [{ position: 1, reason: 'UNSTOCKED', stepId: 's1', stepName: 'Testwort' }],
      },
    }));
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CompleteWorkingAction
          workspaceId={WORKSPACE}
          spellId={SPELL}
          workingId={WORKING}
          steps={[STEPS[0]!]}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText('have no jar · takes nothing')).toBeVisible();
  });

  it('draws a jar as a button only for a step that carries a stock door', async () => {
    open([{ ...STEPS[0]!, stock: STOCK }, STEPS[2]!, STEPS[1]!, STEPS[3]!]);
    await screen.findByRole('list', { name: 'Deductions' });
    expect(screen.getAllByRole('button', { name: /^Edit Stock/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Edit Stock, Testwort, Leaf' })).toBeVisible();
  });

  it('gives no stock button when no step carries a door', async () => {
    open();
    await screen.findByRole('list', { name: 'Deductions' });
    expect(screen.queryByRole('button', { name: /^Edit Stock/ })).toBeNull();
  });

  it('reads the preview again once the stock is saved, so have, left and short by are redrawn', async () => {
    let reads = 0;
    mockGraphQLQuery<WorkingDeductionPreviewQuery>('WorkingDeductionPreview', () => {
      reads += 1;
      const before = reads === 1 ? 1 : 10;
      return {
        workingDeductionPreview: {
          deductions: [
            {
              inventoryItemId: 'i1',
              quantity: Math.min(2, before),
              shortfall: Math.max(2 - before, 0),
              stepId: 's1',
              unit: 'g',
              before,
              lowStockThreshold: 3,
            },
          ],
          warnings: [],
        },
      };
    });
    mockGraphQLMutation<SaveStockMutation, SaveStockMutationVariables>('SaveStock', () => ({
      saveStock: [],
    }));
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <CompleteWorkingAction
          workspaceId={WORKSPACE}
          spellId={SPELL}
          workingId={WORKING}
          steps={[{ ...STEPS[0]!, stock: STOCK }]}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText(/short by 1 g/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Stock, Testwort, Leaf' }));
    const stock = await screen.findByRole('dialog', { name: 'Edit Stock, Testwort' });
    typeIn(within(stock).getByRole('spinbutton', { name: 'Quantity, Leaf' }), '12');
    press(within(stock).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Deductions' })).toHaveTextContent(
        'have 10 g · left 8 g',
      ),
    );
    expect(reads).toBe(2);
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
    // The list reads the same after as before, a step that took nothing included.
    const rows = within(screen.getByRole('list', { name: 'Deductions' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('units differ · takes nothing');
  });
});
