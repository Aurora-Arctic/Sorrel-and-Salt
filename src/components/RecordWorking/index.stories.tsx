import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { RecordWorkingDocument, WorkingDeductionPreviewDocument } from '@/gql/graphql';
import { answerMutation, answerQuery, useMockHandlers } from '../../../.storybook/mock-api';
import { press, useSteps } from '../../../.storybook/press';
import RecordWorkingButton from '.';

// Render-only; behaviour is asserted in tests/components/RecordWorking. Saving and the preview are
// answered by the workshop's fake API (.storybook/mock-api.ts).
const meta = { title: 'Grimoire / Record Working' } satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
const MEMBERS = [
  { userId: 'u1', name: 'Testa Owner' },
  { userId: 'u2', name: 'Mocka Member' },
];
const STEPS = [{ id: 's1', name: 'Testwort' }];

const ANSWERS = [
  answerMutation(RecordWorkingDocument, ({ variables: { input } }) => ({
    recordWorking: {
      id: 'w1',
      status: 'draft' as const,
      note: input.note ?? null,
      workedOn: input.workedOn,
      visibility: input.visibility ?? ('private' as const),
      participants: [{ id: 'p1', name: 'Mocka Member', userId: 'u2' }],
    },
  })),
  answerQuery(WorkingDeductionPreviewDocument, () => ({
    workingDeductionPreview: {
      deductions: [
        {
          inventoryItemId: 'i1',
          quantity: 2,
          shortfall: 0,
          stepId: 's1',
          unit: 'g' as const,
          before: 10,
          lowStockThreshold: 3,
        },
      ],
      warnings: [],
    },
  })),
];

const Driven = ({
  steps = [],
  visibility = 'workspace',
}: {
  steps?: readonly (() => void)[];
  visibility?: 'private' | 'workspace';
}): ReactElement => {
  useMockHandlers(ANSWERS);
  useSteps([() => press('Record a Working of Testwort Tonic'), ...steps], 120);
  return (
    <RecordWorkingButton
      workspaceId={WORKSPACE}
      spellId={SPELL}
      spellName="Testwort Tonic"
      spellVisibility={visibility}
      members={MEMBERS}
      steps={STEPS}
    />
  );
};

const STATES: Record<string, ReactNode> = {
  Closed: (
    <RecordWorkingButton
      workspaceId={WORKSPACE}
      spellId={SPELL}
      spellName="Testwort Tonic"
      spellVisibility="workspace"
      members={MEMBERS}
      steps={STEPS}
    />
  ),
  Open: <Driven />,
  'Private Spell': <Driven visibility="private" />,
  'Deduction Preview': <Driven steps={[() => press('Complete')]} />,
};

// One story with a control to choose the state: the open ones are dialogs, too big to sit beside
// the others (claude-docs/workshop.md, rule 5).
export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
