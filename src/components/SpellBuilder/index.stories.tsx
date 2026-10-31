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

// Render-only; behaviour is asserted in tests/components/SpellBuilder. Each state answers the
// requests it sends through the workshop's fake API: the categories, a saved spell's steps, and
// the save or refusal it shows. The query client is the app's own, from .storybook/preview.tsx.
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

/** Comparison's assigned categories: two the jar carries, and Healing, which it does not. */
const ASSIGNED = namedCategories('Protection', 'Clarity', 'Healing').map(({ id }) => id);

const answerSteps = (steps: SpellBuilderStep[]) =>
  answerQuery(SpellBuilderStepsDocument, ({ variables }) => ({
    spell: { id: variables.id, steps },
  }));

/** The spell as a save answers it: the title typed, at the next revision. */
const savedAnswer = (variables: Record<string, unknown>) => {
  const { title } = variables.input as { title: string | null };
  return { ...SAVED, title, revision: SAVED.revision + 1, status: 'draft', steps: [] };
};

/** What every state answers: the categories, and an empty list should the Steps box be focused. */
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
  // A new spell's first save, refused. A refusal stops at once, where a server fault is retried.
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
  // The save names revision 3 and the row is at 4, saved from somewhere else meanwhile. Reload
  // Latest reads that version.
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

/** This browser's copy of the saved spell, kept ten minutes ago, its title retyped and never saved. */
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
  } catch {
    // No storage: nothing was kept.
  }
};

/**
 * Starts each state from no browser copy, or from Restored Draft's. Written while rendering, so
 * it is in place before the builder reads it as it mounts; removed as the state unmounts.
 */
function useMirror(restored: boolean): void {
  useState(() => {
    removeMirrors();
    if (restored) {
      try {
        window.localStorage.setItem(MIRROR, JSON.stringify(restoredCopy()));
      } catch {
        // No storage: the state shows no recovery notice.
      }
    }
    return null;
  });
  useEffect(() => removeMirrors, []);
}

// In its wide dialog over the grimoire, as the Grimoire's tabs open it under `?new=spell-<slug>` or
// `?edit=<id>` (src/components/SpellBuilder/spell-dialog.tsx), so the workshop shows
// what the app shows. Close closes it, with Open Again to look once more.
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

// Turning the footer's Shared switch on. On a complete private spell it asks before it shares.
const pickCoven = () =>
  document.querySelector<HTMLInputElement>('input[name="visibility"][value="workspace"]')?.click();

const PRIVATE: SpellDialogSpell = { ...SAVED, visibility: 'private' };
const COMPLETE_PRIVATE: SpellDialogSpell = { ...PRIVATE, status: 'complete' };

const BUILDER_STATES: Record<string, ReactNode> = {
  // The usual visit: every field empty, nothing to save until one holds something.
  Empty: <Page />,
  'Title Typed': <Page steps={[typeTitle]} />,
  // A saved spell, as its Edit opens it: its values, its sections shut, nothing to save yet. A
  // shared draft, so the footer's Shared switch is on and still open. Its moon phase is one of
  // the eight, so the box draws its icon.
  'Saved Spell': <Page spell={SAVED} handlers={HANDLERS.noSteps} />,
  // A private draft: its author alone sees it, so the Shared switch is off.
  'Private Spell': <Page spell={PRIVATE} handlers={HANDLERS.noSteps} />,
  // A complete private spell, its Shared switch turned on: the question before it shares for good.
  'Share Question': (
    <Page spell={COMPLETE_PRIVATE} handlers={HANDLERS.noSteps} steps={[pickCoven]} />
  ),
  // A moon phase saved before the list existed: its words, with no icon.
  'Phase Outside the List': (
    <Page spell={{ ...SAVED, moonPhase: 'Dark' }} handlers={HANDLERS.noSteps} steps={[openAll]} />
  ),
  // Each kind of step: ingredient forms with their icons, a toxic one, an instruction and a one-off
  // with its badge. No category is assigned, so Category Match asks for one.
  'With Steps': <Page spell={SAVED} handlers={HANDLERS.steps} steps={[openAll]} />,
  // The same jar against three assigned categories: two carried, Healing missing, and nine
  // extras, the ninth folded away.
  Comparison: (
    <Page spell={{ ...SAVED, categoryIds: ASSIGNED }} handlers={HANDLERS.steps} steps={[openAll]} />
  ),
  // The saved spell's steps still on their way: the jar draws its loading line, and nothing saves.
  'Steps Loading': <Page spell={SAVED} handlers={HANDLERS.stepsLoading} steps={[openAll]} />,
  // The steps could not be read: the Jar section opens by itself to say so.
  'Steps Failed': <Page spell={SAVED} handlers={HANDLERS.stepsFailed} />,
  // A complete shared spell: Duplicate where a draft has Mark Complete, and the Shared switch shut
  // with the reason, since it cannot be made private again.
  'Complete Spell': (
    <Page spell={{ ...SAVED, status: 'complete' }} handlers={HANDLERS.noSteps} steps={[openAll]} />
  ),
  // This browser kept a copy the server never saved: the notice under the title offers it back.
  'Restored Draft': <Page spell={SAVED} handlers={HANDLERS.noSteps} restored />,
  // The bin in the footer, pressed: Delete's question over the form.
  'Delete Question': (
    <Page
      spell={SAVED}
      handlers={HANDLERS.noSteps}
      steps={[() => press('Delete Spell Fixture Working')]}
    />
  ),
  // Mark Complete on a shared draft: the question naming the spell, before it stays shared for good.
  'Complete Question': (
    <Page spell={SAVED} handlers={HANDLERS.noSteps} steps={[() => press('Mark Complete')]} />
  ),
  // A save that landed: the status reads Saved.
  Saved: <Page spell={SAVED} handlers={HANDLERS.saved} steps={[openAll, typeTitle, save]} />,
  // A save that found the spell changed elsewhere: the notice under the title offers Reload Latest
  // and Keep My Version.
  Conflict: <Page spell={SAVED} handlers={HANDLERS.conflict} steps={[openAll, typeTitle, save]} />,
  // A new spell's first save, refused: the status reads "Could not save." with Retry.
  'Refused After Saving': <Page handlers={HANDLERS.refused} steps={[typeTitle, save]} />,
};

export const States: Story = {
  args: { state: 'Empty' },
  argTypes: {
    state: { control: 'select', options: Object.keys(BUILDER_STATES), mapping: BUILDER_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
