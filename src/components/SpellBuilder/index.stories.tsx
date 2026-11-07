import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { RequestHandler } from 'msw';
import type { Route } from 'next';
import { type ReactNode, useEffect, useState } from 'react';
import {
  BUILDER_STEPS as STEPS,
  CATEGORIES_ANSWER,
  namedCategories,
} from '../../../.storybook/grimoire-fixtures';
import {
  answerOperations,
  answerQuery,
  hangOperation,
  refusal,
  useMockHandlers,
} from '../../../.storybook/mock-api';
import { press, setInputValue, submitForm, useSteps } from '../../../.storybook/press';
import { Reopenable } from '../../../.storybook/reopenable';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { mirrorKey } from '../../lib/autosave/mirror';
import { CategoriesDocument } from '../IngredientForm/categories';
import SpellDialog from './spell-dialog';
import { SpellBuilderStepsDocument, SpellIngredientSuggestionsDocument } from './steps/documents';
import type { SpellBuilderStep, SpellBuilderValues, SpellDialogSpell } from './types';

const meta = {
  title: 'Grimoire / Spell Builder',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const USER = 'fixture-user';

const SAVED: SpellDialogSpell = {
  id: 'fixture-spell',
  revision: 3,
  title: 'Fixture Working',
  intent: 'To see clearly',
  jarDescription: '4 oz',
  sealWaxColor: 'Blue',
  moonPhase: 'Waxing Gibbous',
  dayOfWeek: 'Monday',
  note: null,
  visibility: 'workspace',
};

const ASSIGNED = namedCategories('Protection', 'Clarity', 'Healing').map(({ id }) => id);

const answerSteps = (steps: SpellBuilderStep[]) =>
  answerQuery(SpellBuilderStepsDocument, ({ variables }) => ({
    spell: { id: variables.id, steps },
  }));

const savedAnswer = (variables: Record<string, unknown>) => {
  const { title } = variables.input as { title: string | null };
  return { ...SAVED, title, revision: SAVED.revision + 1, status: 'draft', steps: [] };
};

const BASE: readonly RequestHandler[] = [
  answerQuery(CategoriesDocument, () => CATEGORIES_ANSWER),
  answerQuery(SpellIngredientSuggestionsDocument, () => ({ ingredientSuggestions: { edges: [] } })),
];
// Module-level lists, since `useMockHandlers` needs each to keep its identity.
const HANDLERS = {
  base: BASE,
  noSteps: [...BASE, answerSteps([])],
  steps: [...BASE, answerSteps(STEPS)],
  stepsLoading: [...BASE, hangOperation('query', SpellBuilderStepsDocument)],
  stepsFailed: [
    ...BASE,
    answerQuery(SpellBuilderStepsDocument, () =>
      refusal({ message: 'The steps could not be read', code: 'INTERNAL' }),
    ),
  ],
  refused: [
    ...BASE,
    answerOperations(({ operationName }) =>
      operationName === 'CreateSpell'
        ? refusal({ message: 'Forbidden', code: 'FORBIDDEN' })
        : undefined,
    ),
  ],
  saved: [
    ...BASE,
    answerSteps([]),
    answerOperations(({ operationName, variables }) =>
      operationName === 'UpdateSpell' ? { updateSpell: savedAnswer(variables) } : undefined,
    ),
  ],
  conflict: [
    ...BASE,
    answerSteps([]),
    answerOperations(({ operationName, variables }) => {
      if (operationName === 'UpdateSpell') {
        return refusal({
          message: 'This spell was changed since it was opened',
          code: 'STALE_WRITE',
          currentRevision: SAVED.revision + 1,
        });
      }
      if (operationName === 'SpellBuilderReload') {
        return {
          spell: {
            ...SAVED,
            id: variables.id,
            revision: SAVED.revision + 1,
            title: 'Fixture Working, Renamed Elsewhere',
            status: 'draft',
            categories: [],
            steps: [],
          },
        };
      }
      return undefined;
    }),
  ],
} satisfies Record<string, readonly RequestHandler[]>;

const MIRROR = mirrorKey({ entity: 'spell', id: SAVED.id, userId: USER });
const NEW_MIRROR = mirrorKey({ entity: 'spell', id: null, userId: USER });

const restoredCopy = (): { value: SpellBuilderValues; at: string } => ({
  value: {
    title: 'Fixture Working, Retyped',
    intent: SAVED.intent ?? '',
    jarDescription: SAVED.jarDescription ?? '',
    sealWaxColor: SAVED.sealWaxColor ?? '',
    moonPhase: SAVED.moonPhase ?? '',
    dayOfWeek: SAVED.dayOfWeek ?? '',
    note: '',
    visibility: SAVED.visibility,
    status: 'draft',
    categoryIds: [],
    steps: [],
  },
  at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
});

const removeMirrors = () => {
  try {
    window.localStorage.removeItem(MIRROR);
    window.localStorage.removeItem(NEW_MIRROR);
  } catch {}
};

// Written while rendering, so it is in place before the builder reads it as it mounts.
function useMirror(restored: boolean): void {
  useState(() => {
    removeMirrors();
    if (restored) {
      try {
        window.localStorage.setItem(MIRROR, JSON.stringify(restoredCopy()));
      } catch {}
    }
    return null;
  });
  useEffect(() => removeMirrors, []);
}

const Page = ({
  steps = [],
  spell,
  handlers = HANDLERS.base,
  restored = false,
}: {
  steps?: readonly (() => void)[];
  spell?: SpellDialogSpell;
  handlers?: readonly RequestHandler[];
  restored?: boolean;
}) => {
  useMockHandlers(handlers);
  useMirror(restored);
  // Long enough between steps for a saved spell's steps to land, which a save waits for.
  useSteps(steps, 300);
  return (
    <ShellFrame area="coven" open="/coven/fixture-coven/grimoire">
      <Reopenable>
        {() => (
          <SpellDialog
            workspaceId="fixture-coven"
            userId={USER}
            covenSlug="fixture-coven"
            covenName="Fixture Coven"
            closeHref={'/coven/fixture-coven/grimoire' as Route}
            opened={spell ? { spell } : {}}
            canCreate
            canDelete
            canDuplicate
          />
        )}
      </Reopenable>
    </ShellFrame>
  );
};

const typeTitle = () => {
  const input = document.querySelector<HTMLInputElement>('input[name="title"]');
  if (input) setInputValue(input, 'Fixture Working, Retitled');
};
const save = () => submitForm('form.form');
const openAll = () => press('Open All');

const pickCoven = () =>
  document.querySelector<HTMLInputElement>('input[name="visibility"][value="workspace"]')?.click();

const PRIVATE: SpellDialogSpell = { ...SAVED, visibility: 'private' };
const COMPLETE_PRIVATE: SpellDialogSpell = { ...PRIVATE, status: 'complete' };

const BUILDER_STATES: Record<string, ReactNode> = {
  Empty: <Page />,
  'Title Typed': <Page steps={[typeTitle]} />,
  'Saved Spell': <Page spell={SAVED} handlers={HANDLERS.noSteps} />,
  'Private Spell': <Page spell={PRIVATE} handlers={HANDLERS.noSteps} />,
  'Share Question': (
    <Page spell={COMPLETE_PRIVATE} handlers={HANDLERS.noSteps} steps={[pickCoven]} />
  ),
  'Phase Outside the List': (
    <Page spell={{ ...SAVED, moonPhase: 'Dark' }} handlers={HANDLERS.noSteps} steps={[openAll]} />
  ),
  'With Steps': <Page spell={SAVED} handlers={HANDLERS.steps} steps={[openAll]} />,
  Comparison: (
    <Page spell={{ ...SAVED, categoryIds: ASSIGNED }} handlers={HANDLERS.steps} steps={[openAll]} />
  ),
  'Steps Loading': <Page spell={SAVED} handlers={HANDLERS.stepsLoading} steps={[openAll]} />,
  'Steps Failed': <Page spell={SAVED} handlers={HANDLERS.stepsFailed} />,
  'Complete Spell': (
    <Page spell={{ ...SAVED, status: 'complete' }} handlers={HANDLERS.noSteps} steps={[openAll]} />
  ),
  'Restored Draft': <Page spell={SAVED} handlers={HANDLERS.noSteps} restored />,
  'Delete Question': (
    <Page
      spell={SAVED}
      handlers={HANDLERS.noSteps}
      steps={[() => press('Delete Spell Fixture Working')]}
    />
  ),
  'Complete Question': (
    <Page spell={SAVED} handlers={HANDLERS.noSteps} steps={[() => press('Mark Complete')]} />
  ),
  Saved: <Page spell={SAVED} handlers={HANDLERS.saved} steps={[openAll, typeTitle, save]} />,
  Conflict: <Page spell={SAVED} handlers={HANDLERS.conflict} steps={[openAll, typeTitle, save]} />,
  'Refused After Saving': <Page handlers={HANDLERS.refused} steps={[typeTitle, save]} />,
};

export const States: Story = {
  args: { state: 'Empty' },
  argTypes: {
    state: { control: 'select', options: Object.keys(BUILDER_STATES), mapping: BUILDER_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
