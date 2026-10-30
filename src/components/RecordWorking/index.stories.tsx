import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { RequestHandler } from 'msw';
import type { ReactElement, ReactNode } from 'react';
import { RecordWorkingDocument, WorkingDeductionPreviewDocument } from '@/gql/graphql';
import {
  answerMutation,
  answerOperations,
  answerQuery,
  useMockHandlers,
} from '../../../.storybook/mock-api';
import { press, useSteps } from '../../../.storybook/press';
import { isoDay, dayWords, today } from '../DateField/day';
import EditWorkingAction from '../SpellWorkings/edit-working';
import RecordWorkingButton, { CompleteWorkingAction } from '.';
import type { EditableWorking, WorkingStep } from './types';

// Render-only; behaviour is asserted in tests/components/RecordWorking. Saving, deleting and the
// preview are answered by the workshop's fake API (.storybook/mock-api.ts).
const meta = { title: 'Grimoire / Record Working' } satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const SPELL = '00000000-0000-4000-8000-000000000002';
const MEMBERS = [
  { userId: 'u1', name: 'Testa Owner' },
  { userId: 'u2', name: 'Mocka Member' },
];
const STEPS: readonly WorkingStep[] = [
  { id: 's1', name: 'Testwort (Dried Leaf)', form: 'Dried Leaf', seed: 'ingredient-s1' },
];

/** The spell's steps for Shortfall: two jars, a step whose units differ from its jar's, and a one-off. */
const SHORT_STEPS: readonly WorkingStep[] = [
  ...STEPS,
  { id: 's2', name: 'Mockleaf (Oil)', form: 'Oil', seed: 'ingredient-s2' },
  { id: 's3', name: 'Stubroot (Root)', form: 'Root', seed: 'ingredient-s3' },
  { id: 's4', name: 'Fixture Candle', seed: 'Fixture Candle', oneOff: true },
];

const recorded = answerMutation(RecordWorkingDocument, ({ variables: { input } }) => ({
  recordWorking: {
    id: 'w1',
    status: 'draft' as const,
    note: input.note ?? null,
    workedOn: input.workedOn,
    visibility: input.visibility ?? ('private' as const),
    participants: [{ id: 'p1', name: 'Testa Owner', userId: 'u1' }],
  },
}));

const jar = (stepId: string, before: number, quantity: number, lowStockThreshold: number) => ({
  inventoryItemId: `item-${stepId}`,
  stepId,
  before,
  quantity,
  shortfall: Math.max(quantity - before, 0),
  lowStockThreshold,
  unit: 'g' as const,
});

const DRAFT: EditableWorking = {
  id: 'w1',
  workedOn: '2026-10-24',
  note: 'Started at dusk; finishing tomorrow.',
  visibility: 'private',
  status: 'draft',
  participants: [
    { userId: 'u1', name: 'Testa Owner' },
    { userId: null, name: 'A Visiting Friend' },
  ],
};
// Complete and shared with the coven, so its visibility is shut: it only widens.
const COMPLETE: EditableWorking = { ...DRAFT, status: 'complete', visibility: 'workspace' };

// Module-level lists, since `useMockHandlers` needs each to keep its identity.
const HANDLERS = {
  // Ten grams in the jar, two taken, against a Low mark of three: nothing short or low.
  plain: [
    recorded,
    answerQuery(WorkingDeductionPreviewDocument, () => ({
      workingDeductionPreview: { deductions: [jar('s1', 10, 2, 3)], warnings: [] },
    })),
  ],
  // Testwort short by five; Mockleaf left below its Low mark; Stubroot skipped, since its step
  // and its jar measure in different units; the candle a one-off.
  shortfall: [
    recorded,
    answerQuery(WorkingDeductionPreviewDocument, () => ({
      workingDeductionPreview: {
        deductions: [jar('s1', 3, 8, 5), { ...jar('s2', 20, 15, 10), unit: 'ml' as const }],
        warnings: [
          { position: 3, reason: 'UNITS_DIFFER' as const, stepId: 's3', stepName: 'Stubroot' },
          { position: 4, reason: 'CUSTOM' as const, stepId: 's4', stepName: 'Fixture Candle' },
        ],
      },
    })),
  ],
  // An edit's save and Delete Working's write, should either be pressed.
  edit: [
    answerOperations(({ operationName, variables }) => {
      if (operationName === 'UpdateWorking') {
        const { input } = variables as { input: Record<string, unknown> };
        return { updateWorking: { ...DRAFT, ...input, participants: [] } };
      }
      if (operationName === 'DeleteWorking') return { deleteWorking: true };
      return undefined;
    }),
  ],
} satisfies Record<string, readonly RequestHandler[]>;

const Driven = ({
  steps = [],
  visibility = 'workspace',
  spellSteps = STEPS,
  handlers = HANDLERS.plain,
}: {
  steps?: readonly (() => void)[];
  visibility?: 'private' | 'workspace';
  spellSteps?: readonly WorkingStep[];
  handlers?: readonly RequestHandler[];
}): ReactElement => {
  useMockHandlers(handlers);
  useSteps([() => press('Record a Working of Testwort Tonic'), ...steps], 120);
  return (
    <RecordWorkingButton
      workspaceId={WORKSPACE}
      spellId={SPELL}
      spellName="Testwort Tonic"
      spellVisibility={visibility}
      members={MEMBERS}
      recorderId="u1"
      steps={spellSteps}
    />
  );
};

/** A working's pencil, as its row on the recipe page draws it, pressed open. */
const Edit = ({
  working,
  canDelete = false,
  steps = [],
}: {
  working: EditableWorking;
  canDelete?: boolean;
  steps?: readonly (() => void)[];
}): ReactElement => {
  const name = dayWords(working.workedOn);
  useMockHandlers(HANDLERS.edit);
  useSteps([() => press(`Edit Working ${name}`), ...steps], 120);
  return (
    <EditWorkingAction
      name={name}
      canDelete={canDelete}
      workspaceId={WORKSPACE}
      spellId={SPELL}
      spellVisibility="workspace"
      members={MEMBERS}
      steps={STEPS}
      working={working}
    />
  );
};

/** A week from today, whenever the workshop is opened. */
const weekAhead = (): string => {
  const day = new Date(`${today()}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 7);
  return isoDay(day);
};

/** A draft dated ahead: its row's Complete is off, and a press opens the tip giving the day. */
const DatedAhead = (): ReactElement => {
  useSteps([() => press('Complete Working')], 120);
  return (
    <CompleteWorkingAction
      label="Complete Working"
      workspaceId={WORKSPACE}
      spellId={SPELL}
      workingId="w1"
      workedOn={weekAhead()}
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
  // The recorder already named as the first participant.
  Open: <Driven />,
  'Private Spell': <Driven visibility="private" />,
  'Deduction Preview': <Driven steps={[() => press('Complete')]} />,
  Shortfall: (
    <Driven
      spellSteps={SHORT_STEPS}
      handlers={HANDLERS.shortfall}
      steps={[() => press('Complete')]}
    />
  ),
  // A draft's edit, with a participant typed rather than chosen from the coven.
  'Edit Working': <Edit working={DRAFT} />,
  'Edit Complete Working': <Edit working={COMPLETE} />,
  // The bin in the edit's footer, pressed: Delete's question over the form.
  'Delete Working': (
    <Edit
      working={DRAFT}
      canDelete
      steps={[() => press(`Delete Working ${dayWords(DRAFT.workedOn)}`)]}
    />
  ),
  'Dated Ahead': <DatedAhead />,
};

// One story with a control to choose the state: the open ones are dialogs, too big to sit beside
// the others (claude-docs/workshop.md, rule 5).
export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
