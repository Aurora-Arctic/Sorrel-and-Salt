import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from 'next';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  DuplicateSpellMutation,
  DuplicateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { VISIBILITY_LABELS } from '@/components/GrimoireList/params';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

beforeEach(() => {
  router.push.mockClear();
  offerCategories([]);
});

// The spell builder's status control: a spell is a draft until marked complete, and a complete spell shows no button because it cannot be reopened.
// That the service keeps a complete spell titled is tests/modules/grimoire's; here the builder refuses a blank title on the title field and sends the chosen status.

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
  if (props.spell) fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

const SPELL: SpellBuilderSpell = {
  id: 's3',
  revision: 4,
  title: 'Fixture Working',
  intent: null,
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'workspace',
  steps: [],
};

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

const title = () => screen.getByRole('textbox', { name: 'Title' });
const shared = () => screen.getByRole('switch', { name: VISIBILITY_LABELS.workspace });
// The question Mark Complete asks of a shared draft, named by its whole text.
const completing = (name: string) =>
  screen.queryByRole('group', { name: new RegExp(`^Mark ${name} Complete\\?`) });

describe('SpellBuilder status', () => {
  it('offers Mark Complete on a new spell, which is a draft', () => {
    renderBuilder();

    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
    expect(screen.getByText('A draft: not yet finished.')).toBeInTheDocument();
  });

  it('sends the unsaved form as complete when Mark Complete is pressed', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.change(title(), { target: { value: 'Fixture Working' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({
      title: 'Fixture Working',
      status: 'complete',
      visibility: 'private',
    });
    // A private spell's completion locks nothing, so nothing is asked.
    expect(completing('Fixture Working')).toBeNull();
  });

  describe('on a shared draft', () => {
    it('asks first, naming the spell, and Keep It a Draft sends nothing', async () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: SPELL });
      // Why the question could be skipped: the draft is shared, and its switch still moves.
      expect(shared()).toBeChecked();
      expect(shared()).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

      const question = completing('Fixture Working');
      expect(question).toBeVisible();
      expect(question).toHaveTextContent(
        'Mark Fixture Working Complete? It stays shared with every member of the coven for good, ' +
          'and your other changes are saved with it.',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Keep It a Draft' }));

      expect(completing('Fixture Working')).toBeNull();
      expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
      expect(shared()).toBeEnabled();
      expect(calls).toHaveLength(0);
    });

    it('marks it complete once confirmed, and the share is then for good', async () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: SPELL });

      fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));
      fireEvent.click(
        within(completing('Fixture Working')!).getByRole('button', { name: 'Mark Complete' }),
      );

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]?.input).toMatchObject({ status: 'complete', visibility: 'workspace' });
      await waitFor(() => expect(shared()).toBeDisabled());
      expect(completing('Fixture Working')).toBeNull();
    });

    it('refuses a blank title once asked, on the title field, with the question gone', async () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: { ...SPELL, title: null } });

      fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));
      fireEvent.click(
        within(completing('Untitled Spell')!).getByRole('button', { name: 'Mark Complete' }),
      );

      expect(await screen.findByText(/title before marking it complete/i)).toBeVisible();
      expect(completing('Untitled Spell')).toBeNull();
      expect(title()).toHaveFocus();
      expect(calls).toHaveLength(0);
    });

    it('asks of a new spell switched on before its first save, too', () => {
      renderBuilder();
      fireEvent.change(title(), { target: { value: 'Fixture Working' } });
      fireEvent.click(shared());

      fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

      expect(completing('Fixture Working')).toBeVisible();
    });
  });

  it('refuses a blank title on the title field and sends nothing', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    expect(await screen.findByText(/title before marking it complete/i)).toBeVisible();
    expect(title()).toHaveFocus();
    expect(calls).toHaveLength(0);
  });

  it('shows a complete spell no button to change its status', () => {
    renderBuilder({ spell: { ...SPELL, status: 'complete' } });

    expect(screen.queryByRole('button', { name: 'Mark Complete' })).toBeNull();
    expect(screen.queryByRole('button', { name: /reopen/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
  });

  describe('Duplicate', () => {
    const complete = { ...SPELL, status: 'complete' as const };
    const copiedHrefOf = (id: string) => `/coven/fixture-coven/grimoire/drafts?edit=${id}` as Route;

    it('duplicates a complete spell and opens the copy', async () => {
      const calls: DuplicateSpellMutationVariables[] = [];
      mockGraphQLMutation<DuplicateSpellMutation, DuplicateSpellMutationVariables>(
        'DuplicateSpell',
        (variables) => {
          calls.push(variables);
          return { duplicateSpell: { id: 'copy-1' } };
        },
      );
      renderBuilder({ spell: complete, copiedHrefOf });

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith(
          '/coven/fixture-coven/grimoire/drafts?edit=copy-1',
        ),
      );
      expect(calls).toEqual([{ workspaceId: 'w1', id: 's3' }]);
    });

    it('shows itself busy as Duplicating until the copy opens, so a second cannot run', async () => {
      mockGraphQLMutation<DuplicateSpellMutation, DuplicateSpellMutationVariables>(
        'DuplicateSpell',
        () => ({ duplicateSpell: { id: 'copy-1' } }),
      );
      renderBuilder({ spell: complete, copiedHrefOf });

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      const busy = await screen.findByRole('button', { name: 'Duplicating' });
      expect(busy).toHaveAttribute('aria-busy', 'true');
    });

    it('is not drawn for a draft, nor where the member may not create a spell', () => {
      const draft = renderBuilder({ spell: SPELL, copiedHrefOf });
      expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
      draft.unmount();

      renderBuilder({ spell: complete });
      expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
    });

    it('says why when the copy is refused, and stays on the spell', async () => {
      mockGraphQLError('DuplicateSpell', {
        code: 'FORBIDDEN',
        message: 'Not allowed to create a spell here.',
      });
      renderBuilder({ spell: complete, copiedHrefOf });

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      expect(await screen.findByText(/not allowed to create/i)).toBeVisible();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  it('reads a saved spell with no status as a draft', () => {
    renderBuilder({ spell: SPELL });

    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
  });
});
