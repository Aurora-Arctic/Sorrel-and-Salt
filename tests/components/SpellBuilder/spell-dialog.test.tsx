import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellDialogProps } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
// The address as the browser has it, which New Spell's press writes without a server read.
const address = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(address.search),
}));

const { default: SpellDialog } = await import('@/components/SpellBuilder/spell-dialog');

// The spell builder as a modal over the grimoire (M10.12; the owner's call,
// claude-docs/design-decisions/m10.12-spell-builder-modal.md): `?new=spell` opens it
// empty, its first save swaps the address for `?edit=<id>` so a reload or Back
// opens the saved draft, and Close saves what is unsaved before it closes,
// with no question. The saves are answered by MSW in /api/graphql's shape.

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
};

function renderDialog(opened: SpellDialogProps['opened'], canCreate = true) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellDialog workspaceId="w1" closeHref={CLOSE} opened={opened} canCreate={canCreate} />
    </QueryClientProvider>,
  );
}

const dialog = () => screen.getByRole('dialog');
const field = (name: string) => within(dialog()).getByRole('textbox', { name });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const save = () => within(dialog()).getByRole('button', { name: /^Sav/ });
const close = () => within(dialog()).getByRole('button', { name: 'Close' });

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

  it('opens New Spell as a wide dialog with the builder empty', () => {
    renderDialog({});

    expect(screen.getByRole('dialog', { name: 'New Spell' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
    expect(field('Intent')).toHaveValue('');
  });

  // New Spell's press writes `?new=spell` with the browser's pushState, as Add Ingredient's
  // does, so the empty form draws at once with no skeleton before it: the server has not
  // read the address yet, and the dialog reads it itself.
  it('opens New Spell from the address alone, before the server has read it', () => {
    address.search = 'new=spell';
    renderDialog(undefined);

    expect(screen.getByRole('dialog', { name: 'New Spell' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
  });

  it('opens nothing from ?new=spell for a role that may not create a spell', () => {
    address.search = 'new=spell';
    renderDialog(undefined, false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('holds a saved spell back while Add Ingredient’s ?new is in the address', () => {
    address.search = `edit=${SAVED.id}&new=ingredient`;
    renderDialog({ spell: SAVED });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a saved spell as Edit Spell, named by its title, with its values', () => {
    renderDialog({ spell: SAVED });

    expect(screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Fixture Working');
    expect(field('Intent')).toHaveValue('Calm');
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
    await waitFor(() => expect(save()).toBeDisabled());

    type('Intent', 'Calm');
    fireEvent.click(save());

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0]).toMatchObject({ id: 's1', input: { expectedRevision: 1, intent: 'Calm' } });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('does not swap the address on saving a spell it opened saved', async () => {
    const updated = acceptUpdate();
    renderDialog({ spell: SAVED });
    type('Intent', 'Calmer');

    fireEvent.click(save());

    await waitFor(() => expect(updated).toHaveLength(1));
    await waitFor(() => expect(save()).toBeDisabled());
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

      expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
        'Viewers cannot write spells',
      );
      expect(router.replace).not.toHaveBeenCalled();
      expect(field('Title')).toHaveValue('Fixture Working');
    });
  });
});
