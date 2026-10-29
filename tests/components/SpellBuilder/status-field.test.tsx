import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from 'next';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  DuplicateSpellMutation,
  DuplicateSpellMutationVariables,
} from '@/gql/graphql';
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

const title = () => screen.getByRole('textbox', { name: 'Title' });

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
    expect(calls[0]?.input).toMatchObject({ title: 'Fixture Working', status: 'complete' });
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
    expect(screen.queryByRole('button', { name: 'Copy as Draft' })).toBeNull();
  });

  describe('Copy as Draft', () => {
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

      fireEvent.click(screen.getByRole('button', { name: 'Copy as Draft' }));

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith(
          '/coven/fixture-coven/grimoire/drafts?edit=copy-1',
        ),
      );
      expect(calls).toEqual([{ workspaceId: 'w1', id: 's3' }]);
    });

    it('is not drawn for a draft, nor where the member may not create a spell', () => {
      const draft = renderBuilder({ spell: SPELL, copiedHrefOf });
      expect(screen.queryByRole('button', { name: 'Copy as Draft' })).toBeNull();
      draft.unmount();

      renderBuilder({ spell: complete });
      expect(screen.queryByRole('button', { name: 'Copy as Draft' })).toBeNull();
    });

    it('says why when the copy is refused, and stays on the spell', async () => {
      mockGraphQLError('DuplicateSpell', {
        code: 'FORBIDDEN',
        message: 'Not allowed to create a spell here.',
      });
      renderBuilder({ spell: complete, copiedHrefOf });

      fireEvent.click(screen.getByRole('button', { name: 'Copy as Draft' }));

      expect(await screen.findByText(/not allowed to create/i)).toBeVisible();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  it('reads a saved spell with no status as a draft', () => {
    renderBuilder({ spell: SPELL });

    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
  });
});
