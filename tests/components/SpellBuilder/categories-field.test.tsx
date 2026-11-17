import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { CATEGORIES, pickCategory } from '../CategoryPicker/field-harness';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { renderWithQuery } from '../../support/render-with-query';
import { save, submitForm } from '../../support/interact';

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// That the service writes exactly the set sent, and refuses a viewer and another coven's member, is tests/modules/grimoire/services/spells.test.ts's.

const [TESTWARD, SHIELD] = CATEGORIES;

function renderBuilder(props: Partial<SpellBuilderProps> = {}, { shut = false } = {}) {
  offerCategories(CATEGORIES);
  const view = renderWithQuery(<SpellBuilder workspaceId="w1" {...props} />);
  if (props.spell && !shut) fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

const box = () => screen.getByRole('combobox', { name: 'Category' });
const chip = (name: string) => screen.queryByRole('button', { name: `Remove ${name}` });

function answer(id: string, revision: number, input: CreateSpellMutationVariables['input']) {
  return {
    id,
    revision,
    title: input.title ?? null,
    intent: input.intent ?? null,
    jarDescription: input.jarDescription ?? null,
    sealWaxColor: input.sealWaxColor ?? null,
    moonPhase: input.moonPhase ?? null,
    dayOfWeek: input.dayOfWeek ?? null,
    note: input.note ?? null,
    visibility: input.visibility ?? ('workspace' as const),
    status: input.status ?? ('draft' as const),
    steps: [],
  };
}

function acceptCreate() {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: answer('s1', 1, variables.input) };
    },
  );
  return calls;
}

function acceptUpdate() {
  const calls: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>(
    'UpdateSpell',
    (variables) => {
      calls.push(variables);
      return {
        updateSpell: answer(
          String(variables.id),
          (variables.input.expectedRevision ?? 0) + 1,
          variables.input,
        ),
      };
    },
  );
  return calls;
}

const savedSpell = (categoryIds: string[]): SpellBuilderSpell => ({
  id: 's9',
  revision: 3,
  title: 'Hedge Ward',
  intent: null,
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'workspace',
  steps: [],
  categoryIds,
});

describe('the spell builder’s categories', () => {
  it('sends the picked categories with a new spell’s first save', async () => {
    const calls = acceptCreate();
    renderBuilder();

    await pickCategory('Testward');
    await pickCategory('Fixture Shield');
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input.categoryIds).toEqual([TESTWARD.id, SHIELD.id]);
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
    expect(chip('Testward')).toBeInTheDocument();
    expect(chip('Fixture Shield')).toBeInTheDocument();
  });

  it('has something to save once a category is picked, and nothing once it is removed', async () => {
    renderBuilder();
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    await pickCategory('Testward');
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(false);

    fireEvent.click(chip('Testward') as HTMLElement);
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  it('opens a saved spell with its categories, and sends the set left once one is removed', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: savedSpell([TESTWARD.id, SHIELD.id]) });
    await waitFor(() => expect(chip('Testward')).toBeInTheDocument());
    expect(chip('Fixture Shield')).toBeInTheDocument();
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    fireEvent.click(chip('Testward') as HTMLElement);
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ id: 's9', input: { categoryIds: [SHIELD.id] } });
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
    fireEvent.click(chip('Fixture Shield') as HTMLElement);
    submitForm();
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].input.categoryIds).toEqual([]);
  });

  it('names a saved spell’s categories on its shut Purpose line', async () => {
    renderBuilder({ spell: savedSpell([TESTWARD.id, SHIELD.id]) }, { shut: true });
    const purpose = screen.getByRole('button', { name: 'Purpose' });
    expect(purpose).toHaveAttribute('aria-expanded', 'false');

    await waitFor(() =>
      expect(purpose).toHaveAccessibleDescription('Hedge Ward · Testward, Fixture Shield'),
    );
  });

  it('leaves the categories out of a save that did not change them', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: savedSpell([TESTWARD.id]) });
    await waitFor(() => expect(chip('Testward')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Hedge Ward Renewed' },
    });
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input).not.toHaveProperty('categoryIds');
    expect(chip('Testward')).toBeInTheDocument();
  });

  it('puts a refused category beside the field, naming it', async () => {
    mockGraphQLError('CreateSpell', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['categoryIds', 1],
          message: 'No such category to file it under — choose one from the list',
        },
      ],
    });
    renderBuilder();

    await pickCategory('Testward');
    await pickCategory('Fixture Shield');
    submitForm();

    await waitFor(() => expect(box()).toBeInvalid());
    expect(box()).toHaveAccessibleDescription(/Fixture Shield/);
    expect(box()).not.toHaveAccessibleDescription(/Testward/);
    // Placed beside its field, so no notice above the form repeats it.
    expect(
      screen.queryAllByRole('alert').filter((a) => !/Could not save/.test(a.textContent ?? '')),
    ).toEqual([]);
  });
});
