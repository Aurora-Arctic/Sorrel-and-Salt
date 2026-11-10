import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import type { SpellBuilderProps } from '@/components/SpellBuilder/types';
import { VISIBILITY_LABELS } from '@/components/GrimoireList/params';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { renderWithQuery } from '../../support/render-with-query';
import { router } from '../../support/next-navigation';
import { save, submitForm } from '../../support/interact';

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// MSW answers the saves in /api/graphql's shape, so a refusal is read through the route's own error mapping. What the service refuses is tests/modules/grimoire/services/spells.test.ts's.

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  return renderWithQuery(<SpellBuilder workspaceId="w1" {...props} />);
}

const field = (name: string) =>
  screen.queryByRole('textbox', { name }) ?? screen.getByRole('combobox', { name });
const typeInField = (name: string, value: string) =>
  fireEvent.change(field(name), { target: { value } });
const SECTIONS = ['Purpose', 'Jar', 'When to Work It', 'Notes'] as const;
const section = (name: (typeof SECTIONS)[number]) => screen.getByRole('button', { name });
const when = () => section('When to Work It');
const openAll = () => fireEvent.click(screen.getByRole('button', { name: 'Open All' }));

function saved(id: string, revision: number, input: CreateSpellMutationVariables['input']) {
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
    steps: [],
    visibility: input.visibility ?? 'private',
    status: input.status ?? 'draft',
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
  'Jar Description',
  'Seal Wax',
  'Moon Phase',
  'Day',
  'Note',
] as const;

beforeEach(() => {
  router.push.mockClear();
  // The Categories field reads every category as the builder opens; its own
  // tests are categories-field.test.tsx's.
  offerCategories([]);
});

describe('SpellBuilder', () => {
  it('opens a new spell with every field empty and none of them required', () => {
    renderBuilder();

    for (const label of LABELS) {
      expect(field(label)).toHaveValue('');
      expect(field(label)).not.toBeRequired();
    }
    expect(screen.queryByRole('textbox', { name: 'Instructions' })).toBeNull();
  });

  it('has nothing to save until a field holds something', () => {
    renderBuilder();
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    typeInField('Intent', '   ');
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    typeInField('Intent', 'To see clearly');
    expect(save()).toBeEnabled();

    typeInField('Intent', '');
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  it('gives a held Save its reason as its description, and stops once it can save', () => {
    renderBuilder();
    expect(save()).toHaveAttribute('aria-disabled', 'true');
    expect(save()).toHaveAccessibleDescription('Nothing to save yet');

    typeInField('Intent', 'To see clearly');
    expect(save()).toBeEnabled();
    expect(save()).not.toHaveAttribute('aria-disabled');
    expect(save()).not.toHaveAccessibleDescription();
  });

  // After an edit that the autosave had saved, the reason
  // "Nothing to save yet" came back and stayed, as the save left the form matching the row.
  it('does not say there is nothing to save after an edit has been saved', async () => {
    acceptCreate();
    renderBuilder();

    typeInField('Title', 'Fixture Working');
    submitForm();

    await waitFor(() => expect(save()).not.toHaveAccessibleDescription('Nothing to save yet'));
    await waitFor(() => expect(save().matches(':disabled')).toBe(true));
    expect(save()).not.toHaveAccessibleDescription('Nothing to save yet');
  });

  it('saves a draft with only its intent: no field is required', async () => {
    const calls = acceptCreate();
    renderBuilder();

    typeInField('Intent', 'To see clearly');
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      workspaceId: 'w1',
      input: {
        title: null,
        intent: 'To see clearly',
        jarDescription: null,
        sealWaxColor: null,
        moonPhase: null,
        dayOfWeek: null,
        note: null,
        steps: [],
        visibility: 'private',
        status: 'draft',
      },
    });
  });

  it('tidies the spacing of a suggest-only field on blur and keeps other values as typed', async () => {
    const calls = acceptCreate();
    renderBuilder();

    typeInField('Moon Phase', '  Dark   of the moon ');
    fireEvent.blur(field('Moon Phase'));

    expect(field('Moon Phase')).toHaveValue('Dark of the moon');
    await waitFor(() => expect(calls).toHaveLength(1));
  });

  it('sends every field it holds, trimmed, as the schema reads them', async () => {
    const calls = acceptCreate();
    renderBuilder();

    typeInField('Title', '  Fixture Working ');
    typeInField('Intent', 'To see clearly');
    typeInField('Jar Description', '4 oz');
    typeInField('Seal Wax', 'Blue');
    typeInField('Moon Phase', 'Waxing gibbous');
    typeInField('Day', 'Monday');
    typeInField('Note', 'Kept on the sill');
    submitForm();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toEqual({
      title: 'Fixture Working',
      intent: 'To see clearly',
      jarDescription: '4 oz',
      sealWaxColor: 'Blue',
      moonPhase: 'Waxing gibbous',
      dayOfWeek: 'Monday',
      note: 'Kept on the sill',
      steps: [],
      status: 'draft',
      visibility: 'private',
    });
  });

  it('is busy from the press to the answer, and has nothing to save once saved', async () => {
    acceptCreate();
    renderBuilder();

    typeInField('Title', 'Fixture Working');
    const button = save();
    submitForm();

    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button.matches(':disabled, [aria-disabled="true"]')).toBe(true);
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy', 'true'));
    expect(button.matches(':disabled, [aria-disabled="true"]')).toBe(true);
    expect(field('Title')).toHaveValue('Fixture Working');
  });

  // A new spell is created once; a later save is that spell's update, at the
  // revision the last save answered (claude-docs/design-decisions/grimoire.md, "Long forms autosave, and edits of one row can conflict").
  it('saves again as an update of the spell it created, at its revision', async () => {
    const created = acceptCreate('s9');
    const updated = acceptUpdate();
    renderBuilder();

    typeInField('Title', 'Fixture Working');
    submitForm();
    await waitFor(() => expect(created).toHaveLength(1));
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));

    typeInField('Intent', 'To see clearly');
    submitForm();

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
        jarDescription: '4 oz',
        sealWaxColor: 'Blue',
        moonPhase: null,
        dayOfWeek: 'Monday',
        note: null,
        visibility: 'workspace',
        status: 'draft',
      },
    });

    openAll();
    expect(field('Title')).toHaveValue('Fixture Working');
    expect(field('Jar Description')).toHaveValue('4 oz');
    expect(field('Moon Phase')).toHaveValue('');
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    typeInField('Seal Wax', '');
    submitForm();

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]).toEqual({
      workspaceId: 'w1',
      id: 's3',
      input: {
        title: 'Fixture Working',
        intent: 'To see clearly',
        jarDescription: '4 oz',
        sealWaxColor: null,
        moonPhase: null,
        dayOfWeek: 'Monday',
        note: null,
        steps: [],
        visibility: 'workspace',
        status: 'draft',
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

    typeInField('Intent', 'To see clearly');
    submitForm();

    await waitFor(() => expect(field('Title')).toHaveAttribute('aria-invalid', 'true'));
    expect(field('Title')).toHaveAccessibleDescription(
      'Error: Give the spell a title before marking it complete',
    );
    expect(
      screen.queryAllByRole('alert').filter((a) => !/Could not save/.test(a.textContent ?? '')),
    ).toEqual([]);
    expect(save()).toBeEnabled();
  });

  it('puts any other refusal in a notice, in the server’s words', async () => {
    mockGraphQLError('CreateSpell', {
      code: 'FORBIDDEN',
      message: 'Observers cannot write spells',
    });
    renderBuilder();

    typeInField('Title', 'Fixture Working');
    submitForm();

    expect(await screen.findByText('Observers cannot write spells')).toHaveAttribute(
      'role',
      'alert',
    );
    expect(save()).toBeEnabled();
  });

  describe('the moon phase and day of the week suggestions', () => {
    const listed = () => screen.getAllByRole('option').map((option) => option.textContent);

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

      fireEvent.click(screen.getByRole('button', { name: 'Show Day suggestions' }));
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

      typeInField('Moon Phase', 'wan');

      expect(listed()).toEqual(expect.arrayContaining(['Waning Gibbous', 'Waning Crescent']));
      expect(listed()).not.toContain('Full Moon');
    });

    it('saves a picked suggestion', async () => {
      const calls = acceptCreate();
      renderBuilder();

      typeInField('Moon Phase', 'full');
      fireEvent.click(screen.getByRole('option', { name: 'Full Moon' }));
      typeInField('Day', 'fri');
      fireEvent.click(screen.getByRole('option', { name: 'Friday' }));

      expect(field('Moon Phase')).toHaveValue('Full Moon');
      expect(field('Day')).toHaveValue('Friday');
      submitForm();

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input).toMatchObject({ moonPhase: 'Full Moon', dayOfWeek: 'Friday' });
    });

    it('saves typed text that no suggestion holds, as typed', async () => {
      const calls = acceptCreate();
      renderBuilder();

      typeInField('Moon Phase', 'Blue moon');
      typeInField('Day', 'Any dark night');
      submitForm();

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
          jarDescription: null,
          sealWaxColor: null,
          moonPhase: 'Full',
          dayOfWeek: 'saturday',
          note: null,
          visibility: 'workspace',
        },
      });
      openAll();

      expect(field('Moon Phase')).toHaveValue('Full');
      expect(field('Day')).toHaveValue('saturday');
      expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
    });
  });

  describe('the sections', () => {
    const fieldsOf = (name: (typeof SECTIONS)[number]) =>
      document.getElementById(section(name).getAttribute('aria-controls') ?? '') as HTMLElement;
    const expanded = () => SECTIONS.map((name) => section(name).getAttribute('aria-expanded'));
    const SAVED = {
      id: 's3',
      revision: 1,
      title: 'Fixture Working',
      intent: 'To see\n  clearly',
      jarDescription: '4 oz',
      sealWaxColor: 'Blue',
      moonPhase: 'Waxing Moon',
      dayOfWeek: 'Monday',
      note: null,
      visibility: 'private' as const,
      steps: [],
    };

    it('opens a new spell with its four sections in order, each open on its own fields', () => {
      renderBuilder();

      expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        ...SECTIONS,
      ]);
      expect(expanded()).toEqual(['true', 'true', 'true', 'true']);
      const HELD = {
        Purpose: ['Title', 'Intent', 'Category'],
        Jar: ['Jar Description', 'Seal Wax', 'Add to Jar'],
        'When to Work It': ['Moon Phase', 'Day'],
        Notes: ['Note'],
      } as const;
      for (const name of SECTIONS) {
        const inside = within(fieldsOf(name));
        const boxes = [...inside.queryAllByRole('textbox'), ...inside.queryAllByRole('combobox')];
        expect(boxes).toHaveLength(HELD[name].length);
        for (const label of HELD[name]) {
          expect(
            inside.queryByRole('textbox', { name: label }) ??
              inside.getByRole('combobox', { name: label }),
          ).toBeVisible();
        }
      }
      // The visibility switch is the footer's, not a field Notes folds.
      expect(within(fieldsOf('Notes')).queryByRole('switch')).toBeNull();
    });

    it('opens a saved spell with every section shut, each line naming what it holds', () => {
      renderBuilder({ spell: SAVED });

      expect(expanded()).toEqual(['false', 'false', 'false', 'false']);
      expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
      expect(section('Purpose')).toHaveAccessibleDescription('Fixture Working · To see clearly');
      expect(section('Jar')).toHaveAccessibleDescription('4 oz · Blue');
      expect(when()).toHaveAccessibleDescription('Waxing Moon · Monday');
      expect(section('Notes')).toHaveAccessibleDescription('Nothing yet');
    });

    it('shuts every section with Close All, then opens every one with Open All', () => {
      renderBuilder();
      expect(expanded()).toEqual(['true', 'true', 'true', 'true']);

      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
      expect(expanded()).toEqual(['false', 'false', 'false', 'false']);

      openAll();
      expect(expanded()).toEqual(['true', 'true', 'true', 'true']);
      expect(screen.getByRole('button', { name: 'Close All' })).toBeInTheDocument();
    });

    it('offers Close All while any one section is open', () => {
      renderBuilder({ spell: SAVED });
      fireEvent.click(section('Jar'));

      fireEvent.click(screen.getByRole('button', { name: 'Close All' }));

      expect(expanded()).toEqual(['false', 'false', 'false', 'false']);
    });

    it('keeps what was typed across a shut, its line reading it', () => {
      renderBuilder();
      typeInField('Day', 'Friday');

      fireEvent.click(when());

      expect(when()).toHaveAttribute('aria-expanded', 'false');
      expect(when()).toHaveAccessibleDescription('Friday');
      fireEvent.click(when());
      expect(field('Day')).toHaveValue('Friday');
    });

    it('opens the shut section a refused save names, flagged, and leaves the rest shut', async () => {
      mockGraphQLError('UpdateSpell', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['moonPhase'], message: 'Name a moon phase' }],
      });
      renderBuilder({ spell: SAVED });
      fireEvent.click(section('Notes'));
      typeInField('Note', 'Kept on the sill');
      // The precondition the opening answers: shut when the save is pressed.
      expect(when()).toHaveAttribute('aria-expanded', 'false');

      submitForm();

      await waitFor(() => expect(when()).toHaveAttribute('aria-expanded', 'true'));
      expect(when()).toHaveAccessibleDescription('Has an error to fix');
      expect(field('Moon Phase')).toHaveAccessibleDescription(
        expect.stringContaining('Error: Name a moon phase'),
      );
      expect(section('Purpose')).toHaveAttribute('aria-expanded', 'false');
      expect(section('Jar')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('guarding typed changes', () => {
    const tabCloseAsks = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    it('has the browser ask before the tab closes on an unsaved visibility choice', () => {
      renderBuilder();
      // Why the tab could have closed: nothing typed, so no question yet.
      expect(tabCloseAsks()).toBe(false);

      fireEvent.click(screen.getByRole('switch', { name: VISIBILITY_LABELS.workspace }));

      expect(tabCloseAsks()).toBe(true);
    });

    it('has the browser ask before the tab closes on unsaved changes, and not once they are saved', async () => {
      acceptCreate();
      renderBuilder();
      expect(tabCloseAsks()).toBe(false);
      typeInField('Title', 'Fixture Working');

      expect(tabCloseAsks()).toBe(true);

      submitForm();
      await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
      await waitFor(() => expect(save()).not.toHaveAttribute('aria-busy', 'true'));
      expect(tabCloseAsks()).toBe(false);
    });
  });
});
