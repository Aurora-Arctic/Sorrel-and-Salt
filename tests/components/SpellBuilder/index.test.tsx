import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');
const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// The spell builder's title, intent and jar fields (M10.12, story 47). The
// saves are answered by MSW in the shape /api/graphql answers, so a refusal is
// read through the route's own error mapping; that the service refuses a
// viewer, and a complete spell with no title, is
// tests/modules/grimoire/services/spells.test.ts's.

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
}

// Moon phase and day of the week are boxes that suggest (comboboxes); the rest are text boxes.
const field = (name: string) =>
  screen.queryByRole('textbox', { name }) ?? screen.getByRole('combobox', { name });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);

/** The spell as the server answers a save: every field as sent, at `revision`. */
function saved(id: string, revision: number, input: CreateSpellMutationVariables['input']) {
  return {
    id,
    revision,
    title: input.title ?? null,
    intent: input.intent ?? null,
    jarSize: input.jarSize ?? null,
    sealWaxColor: input.sealWaxColor ?? null,
    moonPhase: input.moonPhase ?? null,
    dayOfWeek: input.dayOfWeek ?? null,
    note: input.note ?? null,
    steps: [],
    visibility: input.visibility ?? 'workspace',
  };
}

function acceptCreate(id = 's1') {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: saved(id, 1, variables.input) };
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
        updateSpell: saved(
          String(variables.id),
          (variables.input.expectedRevision ?? 0) + 1,
          variables.input,
        ),
      };
    },
  );
  return calls;
}

const LABELS = [
  'Title',
  'Intent',
  'Jar Size',
  'Seal Wax Colour',
  'Moon Phase',
  'Day of the Week',
  'Note',
] as const;

beforeEach(() => {
  push.mockClear();
});

describe('SpellBuilder', () => {
  it('opens a new spell with every field empty and none of them required', () => {
    renderBuilder();

    for (const label of LABELS) {
      expect(field(label)).toHaveValue('');
      expect(field(label)).not.toBeRequired();
    }
    // The recipe's steps are M13.3's; a step's instruction is its own field there.
    expect(screen.queryByRole('textbox', { name: 'Instructions' })).toBeNull();
  });

  it('goes back by a link, not a Cancel button', () => {
    renderBuilder();

    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('has nothing to save until a field holds something', () => {
    renderBuilder();
    expect(save()).toBeDisabled();

    // Blank is none, as the service reads it: still nothing to save.
    type('Intent', '   ');
    expect(save()).toBeDisabled();

    type('Intent', 'To see clearly');
    expect(save()).toBeEnabled();

    type('Intent', '');
    expect(save()).toBeDisabled();
  });

  it('saves a draft with only its intent: no field is required', async () => {
    const calls = acceptCreate();
    renderBuilder();

    type('Intent', 'To see clearly');
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      workspaceId: 'w1',
      input: {
        title: null,
        intent: 'To see clearly',
        jarSize: null,
        sealWaxColor: null,
        moonPhase: null,
        dayOfWeek: null,
        note: null,
        steps: [],
        visibility: 'workspace',
      },
    });
  });

  it('sends every field it holds, trimmed, as the schema reads them', async () => {
    const calls = acceptCreate();
    renderBuilder();

    type('Title', '  Fixture Working ');
    type('Intent', 'To see clearly');
    type('Jar Size', '4 oz');
    type('Seal Wax Colour', 'Blue');
    type('Moon Phase', 'Waxing gibbous');
    type('Day of the Week', 'Monday');
    type('Note', 'Kept on the sill');
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toEqual({
      title: 'Fixture Working',
      intent: 'To see clearly',
      jarSize: '4 oz',
      sealWaxColor: 'Blue',
      moonPhase: 'Waxing gibbous',
      dayOfWeek: 'Monday',
      note: 'Kept on the sill',
      steps: [],
      visibility: 'workspace',
    });
  });

  it('is busy from the press to the answer, and has nothing to save once saved', async () => {
    acceptCreate();
    renderBuilder();

    type('Title', 'Fixture Working');
    const button = save();
    submit();

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy', 'true'));
    expect(button).toBeDisabled();
    expect(field('Title')).toHaveValue('Fixture Working');
  });

  // A new spell is created once; a later save is that spell's update, at the
  // revision the last save answered (claude-docs/design-decisions/m13.14-plan.md).
  it('saves again as an update of the spell it created, at its revision', async () => {
    const created = acceptCreate('s9');
    const updated = acceptUpdate();
    renderBuilder();

    type('Title', 'Fixture Working');
    submit();
    await waitFor(() => expect(created).toHaveLength(1));
    await waitFor(() => expect(save()).toBeDisabled());

    type('Intent', 'To see clearly');
    submit();

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(created).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      workspaceId: 'w1',
      id: 's9',
      input: { title: 'Fixture Working', intent: 'To see clearly', expectedRevision: 1 },
    });
  });

  it('opens a saved spell with its values, and saves it as an update', async () => {
    const updated = acceptUpdate();
    renderBuilder({
      spell: {
        id: 's3',
        revision: 4,
        steps: [],
        title: 'Fixture Working',
        intent: 'To see clearly',
        jarSize: '4 oz',
        sealWaxColor: 'Blue',
        moonPhase: null,
        dayOfWeek: 'Monday',
        note: null,
        visibility: 'workspace',
      },
    });

    expect(field('Title')).toHaveValue('Fixture Working');
    expect(field('Jar Size')).toHaveValue('4 oz');
    expect(field('Moon Phase')).toHaveValue('');
    expect(save()).toBeDisabled();

    // A field emptied is a field cleared: null, not left out.
    type('Seal Wax Colour', '');
    submit();

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]).toEqual({
      workspaceId: 'w1',
      id: 's3',
      input: {
        title: 'Fixture Working',
        intent: 'To see clearly',
        jarSize: '4 oz',
        sealWaxColor: null,
        moonPhase: null,
        dayOfWeek: 'Monday',
        note: null,
        steps: [],
        visibility: 'workspace',
        expectedRevision: 4,
      },
    });
  });

  it('puts a refusal on a field beside that field', async () => {
    mockGraphQLError('CreateSpell', {
      code: 'VALIDATION',
      fieldErrors: [
        { path: ['title'], message: 'Give the spell a title before marking it complete' },
      ],
    });
    renderBuilder();

    type('Intent', 'To see clearly');
    submit();

    await waitFor(() => expect(field('Title')).toHaveAttribute('aria-invalid', 'true'));
    expect(field('Title')).toHaveAccessibleDescription(
      'Give the spell a title before marking it complete',
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(save()).toBeEnabled();
  });

  it('puts any other refusal in a notice, in the server’s words', async () => {
    mockGraphQLError('CreateSpell', { code: 'FORBIDDEN', message: 'Viewers cannot write spells' });
    renderBuilder();

    type('Title', 'Fixture Working');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Viewers cannot write spells');
    expect(save()).toBeEnabled();
  });

  // Moon phase and day of the week suggest a fixed list and still take what is
  // typed (the owner, 2026-10-27): the columns stay free text.
  describe('the moon phase and day of the week suggestions', () => {
    const listed = () => screen.getAllByRole('option').map((option) => option.textContent);

    // The recipe's timing, when to work the spell, grouped under its own heading.
    it('groups the two under When to Work It', () => {
      renderBuilder();

      const group = screen.getByRole('group', { name: 'When to Work It' });
      expect(within(group).getByRole('combobox', { name: 'Moon Phase' })).toBeInTheDocument();
      expect(within(group).getByRole('combobox', { name: 'Day of the Week' })).toBeInTheDocument();
      expect(within(group).queryByRole('textbox', { name: 'Jar Size' })).toBeNull();
    });

    it('offers the moon phases and the seven days', () => {
      renderBuilder();

      fireEvent.click(screen.getByRole('button', { name: 'Show Moon Phase suggestions' }));
      expect(listed()).toEqual([
        'New Moon',
        'Waxing Crescent',
        'First Quarter',
        'Waxing Gibbous',
        'Full Moon',
        'Waning Gibbous',
        'Last Quarter',
        'Waning Crescent',
        'Dark Moon',
        'Waxing Moon',
        'Waning Moon',
      ]);
      fireEvent.click(screen.getByRole('button', { name: 'Show Moon Phase suggestions' }));

      fireEvent.click(screen.getByRole('button', { name: 'Show Day of the Week suggestions' }));
      expect(listed()).toEqual([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]);
    });

    it('narrows the list to what is typed', () => {
      renderBuilder();

      type('Moon Phase', 'wan');

      expect(listed()).toEqual(expect.arrayContaining(['Waning Gibbous', 'Waning Crescent']));
      expect(listed()).not.toContain('Full Moon');
    });

    it('saves a picked suggestion', async () => {
      const calls = acceptCreate();
      renderBuilder();

      type('Moon Phase', 'full');
      fireEvent.click(screen.getByRole('option', { name: 'Full Moon' }));
      type('Day of the Week', 'fri');
      fireEvent.click(screen.getByRole('option', { name: 'Friday' }));

      expect(field('Moon Phase')).toHaveValue('Full Moon');
      expect(field('Day of the Week')).toHaveValue('Friday');
      submit();

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input).toMatchObject({ moonPhase: 'Full Moon', dayOfWeek: 'Friday' });
    });

    it('saves typed text that no suggestion holds, as typed', async () => {
      const calls = acceptCreate();
      renderBuilder();

      type('Moon Phase', 'Blue moon');
      type('Day of the Week', 'Any dark night');
      submit();

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input).toMatchObject({
        moonPhase: 'Blue moon',
        dayOfWeek: 'Any dark night',
      });
    });

    it('opens a saved value the list does not hold, unchanged', () => {
      renderBuilder({
        spell: {
          id: 's3',
          revision: 1,
          steps: [],
          title: null,
          intent: null,
          jarSize: null,
          sealWaxColor: null,
          moonPhase: 'Full',
          dayOfWeek: 'saturday',
          note: null,
          visibility: 'workspace',
        },
      });

      expect(field('Moon Phase')).toHaveValue('Full');
      expect(field('Day of the Week')).toHaveValue('saturday');
      expect(save()).toBeDisabled();
    });
  });

  describe('guarding typed changes', () => {
    /** A link elsewhere on the page, as the coven nav is. */
    function Go() {
      const navigation = usePendingNavigation();
      return (
        <button type="button" onClick={() => navigation.navigate('/coven/a/grimoire')}>
          Grimoire
        </button>
      );
    }

    const asking = () => screen.queryByRole('dialog', { name: 'Discard Changes?' });

    it('asks before a link leaves unsaved changes', () => {
      render(
        <QueryClientProvider client={makeQueryClient()}>
          <NavigationProvider>
            <SpellBuilder workspaceId="w1" />
            <Go />
          </NavigationProvider>
        </QueryClientProvider>,
      );
      type('Title', 'Fixture Working');

      fireEvent.click(screen.getByRole('button', { name: 'Grimoire' }));

      expect(asking()).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });

    it('lets a link go once the changes are saved', async () => {
      acceptCreate();
      render(
        <QueryClientProvider client={makeQueryClient()}>
          <NavigationProvider>
            <SpellBuilder workspaceId="w1" />
            <Go />
          </NavigationProvider>
        </QueryClientProvider>,
      );
      type('Title', 'Fixture Working');
      submit();
      await waitFor(() => expect(save()).toBeDisabled());
      await waitFor(() => expect(save()).not.toHaveAttribute('aria-busy', 'true'));

      fireEvent.click(screen.getByRole('button', { name: 'Grimoire' }));

      expect(asking()).toBeNull();
      expect(push).toHaveBeenCalledWith('/coven/a/grimoire');
    });
  });
});
