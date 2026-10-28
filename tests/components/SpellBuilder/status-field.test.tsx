import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

beforeEach(() => offerCategories([]));

// The spell builder's status control (M10.20, story 55): a spell is a draft until
// it is marked complete, and a complete spell can be reopened. That the service
// keeps a complete spell titled is tests/modules/grimoire's; here the builder
// refuses a blank title on the title field and sends the chosen status.

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
        updateSpell: answer(String(variables.id), (variables.input.expectedRevision ?? 0) + 1, {
          ...variables.input,
        }),
      };
    },
  );
  return calls;
}

const title = () => screen.getByRole('textbox', { name: 'Title' });

describe('SpellBuilder status', () => {
  it('offers Mark Complete on a new spell, which is a draft', () => {
    renderBuilder();

    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Reopen as Draft' })).toBeNull();
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

  it('reopens a complete spell as a draft', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: { ...SPELL, status: 'complete' } });

    expect(screen.queryByRole('button', { name: 'Mark Complete' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen as Draft' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ status: 'draft', expectedRevision: 4 });
  });

  it('reads a saved spell with no status as a draft', () => {
    renderBuilder({ spell: SPELL });

    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
  });
});
