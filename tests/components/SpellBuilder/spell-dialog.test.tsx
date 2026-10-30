import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  SpellBuilderStepsQuery,
  SpellBuilderStepsQueryVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderStep, SpellDialogProps } from '@/components/SpellBuilder/types';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { server } from '../../support/msw/server';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
// The address as the browser has it, which New Spell's press writes without a server read.
const address = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(address.search),
}));

const { default: SpellDialog } = await import('@/components/SpellBuilder/spell-dialog');

// The spell builder as a modal over the grimoire (claude-docs/design-decisions/m10.12-spell-builder-modal.md): `?new=spell` opens it empty, its first save swaps the address for `?edit=<id>`, and Close saves what is unsaved with no question.
// A saved spell's steps are read once it opens and nothing is sent before they land. MSW answers the reads and saves in /api/graphql's shape.

const CLOSE = '/coven/fixture-coven/grimoire' as Route;
const editHref = (id: string) => `/coven/fixture-coven/grimoire?edit=${id}` as Route;

const SAVED = {
  id: 's9',
  revision: 3,
  title: 'Fixture Working',
  intent: 'Calm',
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'workspace' as const,
  steps: [],
};

/** A saved step, as the dialog's read of a saved spell's steps answers it. */
const ROSEWORT_STEP: SpellBuilderStep = {
  id: '00000000-0000-4000-8000-000000000008',
  name: 'Fixture Rosewort',
  form: 'dried leaf',
  quantity: 3,
  unit: 'g',
  body: null,
  ingredient: {
    id: '00000000-0000-4000-8000-000000000001',
    toxic: false,
    safetyNotes: null,
    categories: [],
    stock: [],
  },
  variant: {
    id: '00000000-0000-4000-8000-000000000002',
    toxic: false,
    safetyNotes: null,
    categories: [],
    formChoice: null,
  },
};

/** `ROSEWORT_STEP` as an update sends it back. */
const ROSEWORT_SENT = {
  id: ROSEWORT_STEP.id,
  ingredientId: ROSEWORT_STEP.ingredient?.id,
  variantId: ROSEWORT_STEP.variant?.id,
  quantity: 3,
  unit: 'g',
};

/** Answers the read of a saved spell's steps with `steps`, once `landed` settles. */
function answerSteps(steps: SpellBuilderStep[] = [], landed?: Promise<void>) {
  const reads: SpellBuilderStepsQueryVariables[] = [];
  server.use(
    graphqlLink.query<SpellBuilderStepsQuery, SpellBuilderStepsQueryVariables>(
      'SpellBuilderSteps',
      async ({ variables }) => {
        reads.push(variables);
        await landed;
        return HttpResponse.json({ data: { spell: { id: String(variables.id), steps } } });
      },
    ),
  );
  return reads;
}

function renderDialog(opened: SpellDialogProps['opened'], canCreate = true) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellDialog
        workspaceId="w1"
        covenSlug="testwort-coven"
        covenName="Testwort Coven"
        closeHref={CLOSE}
        opened={opened}
        canCreate={canCreate}
      />
    </QueryClientProvider>,
  );
}

const dialog = () => screen.getByRole('dialog');
const field = (name: string) => within(dialog()).getByRole('textbox', { name });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const save = () => within(dialog()).getByRole('button', { name: /^Sav/ });
const close = () => within(dialog()).getByRole('button', { name: 'Close' });
// A saved spell opens with its sections shut, as an edited ingredient does: Open All shows its fields.
const openAll = () => fireEvent.click(within(dialog()).getByRole('button', { name: 'Open All' }));
/** The jar's list of steps, drawn once a saved spell's steps have landed. */
const stepsLanded = () => within(dialog()).findByRole('list', { name: 'Steps' });

/** The spell as the server answers a save: every field as sent, at `revision`. */
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

function acceptCreate(id = 's1') {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: answer(id, 1, variables.input) };
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
      const revision = (variables.input.expectedRevision ?? 0) + 1;
      return { updateSpell: answer(String(variables.id), revision, variables.input) };
    },
  );
  return calls;
}

beforeEach(() => {
  offerCategories([]);
  answerSteps();
  address.search = '';
  router.push.mockReset();
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('SpellDialog', () => {
  it('opens nothing when the address names no spell to write', () => {
    renderDialog(undefined);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Headed as Add Ingredient is: the coven it lands in over the title, the dialog named
  // by the phrase.
  it('opens New Spell to its coven, with the builder empty', () => {
    renderDialog({});

    expect(screen.getByRole('dialog', { name: 'New Spell to Testwort Coven' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
    expect(field('Intent')).toHaveValue('');
  });

  // New Spell's press writes `?new=spell-<slug>` with the browser's pushState, as Add Ingredient's
  // does, so the empty form draws at once with no skeleton before it: the server has not
  // read the address yet, and the dialog reads it itself.
  it('opens New Spell from the address alone, before the server has read it', () => {
    address.search = 'new=spell-testwort-coven';
    renderDialog(undefined);

    expect(screen.getByRole('dialog', { name: 'New Spell to Testwort Coven' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
  });

  it('opens New Spell from ?new=spell, the current grimoire’s', () => {
    address.search = 'new=spell';
    renderDialog(undefined);

    expect(screen.getByRole('dialog', { name: 'New Spell to Testwort Coven' })).toBeInTheDocument();
  });

  it('opens nothing for another coven’s ?new=spell-<slug>', () => {
    address.search = 'new=spell-other-coven';
    renderDialog(undefined);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens nothing from ?new=spell-<slug> for a role that may not create a spell', () => {
    address.search = 'new=spell-testwort-coven';
    renderDialog(undefined, false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('holds a saved spell back while Add Ingredient’s ?new is in the address', () => {
    address.search = `edit=${SAVED.id}&new=ingredient-coven-testwort-coven`;
    renderDialog({ spell: SAVED });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a saved spell as Edit Spell, named by its title, with its values', () => {
    renderDialog({ spell: SAVED });

    expect(screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' })).toBeInTheDocument();
    openAll();
    expect(field('Title')).toHaveValue('Fixture Working');
    expect(field('Intent')).toHaveValue('Calm');
  });

  it('reads a saved spell’s steps once it opens, and sends them with the next update', async () => {
    const reads = answerSteps([ROSEWORT_STEP]);
    const updated = acceptUpdate();
    renderDialog({ spell: SAVED });
    openAll();

    // Until they land the jar shows its loading state, and there is nothing to save.
    expect(within(dialog()).getByRole('region', { name: 'Steps' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    const steps = await stepsLanded();
    expect(within(steps).getByRole('listitem')).toHaveTextContent('Fixture Rosewort');
    expect(reads).toEqual([{ workspaceId: 'w1', id: SAVED.id }]);
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    type('Intent', 'Calmer');
    fireEvent.click(save());

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]?.input.steps).toEqual([ROSEWORT_SENT]);
  });

  it('sends nothing while a saved spell’s steps are on their way: Save is off', async () => {
    let land = () => {};
    answerSteps([ROSEWORT_STEP], new Promise((resolve) => (land = resolve)));
    const updated = acceptUpdate();
    renderDialog({ spell: SAVED });
    openAll();
    type('Intent', 'Calmer');

    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
    // Enter in a field submits the form even with Save off.
    fireEvent.submit(field('Title').closest('form') as HTMLFormElement);
    await act(async () => {});
    expect(updated).toHaveLength(0);

    land();
    await stepsLanded();
    // The change typed while they loaded is kept, and now saves with them.
    expect(field('Intent')).toHaveValue('Calmer');
    fireEvent.click(save());
    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]?.input).toMatchObject({ intent: 'Calmer', steps: [ROSEWORT_SENT] });
  });

  it('names a saved spell with no title Untitled Spell, as its card does', () => {
    renderDialog({ spell: { ...SAVED, title: null } });

    expect(screen.getByRole('dialog', { name: 'Edit Spell, Untitled Spell' })).toBeInTheDocument();
  });

  it('swaps the address for the saved draft’s on its first save, keeping what is typed', async () => {
    const created = acceptCreate('s1');
    renderDialog({});
    type('Title', 'Fixture Working');

    fireEvent.click(save());

    await waitFor(() => expect(created).toHaveLength(1));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(editHref('s1'), { scroll: false }),
    );
    // Replaced, not pushed: Back goes to the grimoire, not to an empty New Spell.
    expect(router.push).not.toHaveBeenCalled();
    // The same form, not a fresh one: what was typed stays.
    expect(field('Title')).toHaveValue('Fixture Working');
  });

  it('swaps the address once: a later save updates the draft and leaves the address be', async () => {
    acceptCreate('s1');
    const updated = acceptUpdate();
    renderDialog({});
    type('Title', 'Fixture Working');
    fireEvent.click(save());
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));

    type('Intent', 'Calm');
    fireEvent.click(save());

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]).toMatchObject({ id: 's1', input: { expectedRevision: 1, intent: 'Calm' } });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('does not swap the address on saving a spell it opened saved', async () => {
    const updated = acceptUpdate();
    renderDialog({ spell: SAVED });
    openAll();
    await stepsLanded();
    type('Intent', 'Calmer');

    fireEvent.click(save());

    await waitFor(() => expect(updated).toHaveLength(1));
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('has no Cancel: Close is the way out', () => {
    renderDialog({});

    expect(within(dialog()).queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  describe('Close', () => {
    it('closes at once, back to the grimoire, with nothing to save', async () => {
      const created = acceptCreate();
      renderDialog({});

      await act(async () => {
        fireEvent.click(close());
      });

      expect(router.replace).toHaveBeenCalledWith(CLOSE);
      expect(created).toHaveLength(0);
    });

    it('saves a new spell’s typed fields before it closes, asking nothing', async () => {
      const created = acceptCreate();
      renderDialog({});
      type('Title', 'Fixture Working');

      // The precondition the save answers: the form has something unsaved.
      expect(save()).toBeEnabled();
      await act(async () => {
        fireEvent.click(close());
      });

      expect(screen.queryByText(/Discard/)).toBeNull();
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(CLOSE));
      expect(created).toHaveLength(1);
      expect(created[0].input).toMatchObject({ title: 'Fixture Working' });
      // Saved, then closed: never the draft's own address on the way out.
      expect(router.replace).not.toHaveBeenCalledWith(editHref('s1'), expect.anything());
      expect(router.refresh).toHaveBeenCalled();
    });

    it('saves a saved spell’s change as an update before it closes', async () => {
      const updated = acceptUpdate();
      renderDialog({ spell: SAVED });
      openAll();
      await stepsLanded();
      type('Intent', 'Calmer');

      await act(async () => {
        fireEvent.click(close());
      });

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(CLOSE));
      expect(updated).toHaveLength(1);
      expect(updated[0]).toMatchObject({
        id: 's9',
        input: { expectedRevision: 3, intent: 'Calmer' },
      });
    });

    it('holds a Close pressed before a saved spell’s steps land, then saves with them and closes', async () => {
      let land = () => {};
      answerSteps([ROSEWORT_STEP], new Promise((resolve) => (land = resolve)));
      const updated = acceptUpdate();
      renderDialog({ spell: SAVED });
      openAll();
      type('Intent', 'Calmer');

      await act(async () => {
        fireEvent.click(close());
      });
      // Held: a save now would send no steps, and an update's steps are the whole recipe.
      expect(updated).toHaveLength(0);
      expect(router.replace).not.toHaveBeenCalled();

      land();

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(CLOSE));
      expect(updated).toHaveLength(1);
      expect(updated[0]?.input).toMatchObject({ intent: 'Calmer', steps: [ROSEWORT_SENT] });
    });

    it('opens a saved spell’s shut Jar alone to show its steps could not be read', async () => {
      mockGraphQLError('SpellBuilderSteps', { code: 'NOT_FOUND', message: 'No such spell' });
      renderDialog({ spell: SAVED });
      const jar = within(dialog()).getByRole('button', { name: 'Jar' });
      // Shut as the saved spell opens, so without the opening the failure would be hidden.
      expect(jar).toHaveAttribute('aria-expanded', 'false');

      expect(await within(dialog()).findByRole('alert')).toBeVisible();
      expect(jar).toHaveAttribute('aria-expanded', 'true');
      expect(within(dialog()).getByRole('button', { name: 'Purpose' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('closes and sends nothing when a saved spell’s steps cannot be read, though a field changed', async () => {
      mockGraphQLError('SpellBuilderSteps', { code: 'NOT_FOUND', message: 'No such spell' });
      const updated = acceptUpdate();
      renderDialog({ spell: SAVED });
      openAll();
      // A change, so Close has something it would save, and a save would be refused.
      type('Intent', 'Calmer');

      expect(await within(dialog()).findByRole('alert')).toBeInTheDocument();
      expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
      await act(async () => {
        fireEvent.click(close());
      });

      expect(router.replace).toHaveBeenCalledWith(CLOSE);
      expect(updated).toHaveLength(0);
    });

    it('stays open with the refusal shown when the save on Close is refused', async () => {
      mockGraphQLError('CreateSpell', {
        code: 'FORBIDDEN',
        message: 'Viewers cannot write spells',
      });
      renderDialog({});
      type('Title', 'Fixture Working');

      await act(async () => {
        fireEvent.click(close());
      });

      expect(await within(dialog()).findByText('Viewers cannot write spells')).toHaveAttribute(
        'role',
        'alert',
      );
      expect(router.replace).not.toHaveBeenCalled();
      expect(field('Title')).toHaveValue('Fixture Working');
    });
  });
});
