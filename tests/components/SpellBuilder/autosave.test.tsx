import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateSpellMutation,
  CreateSpellMutationVariables,
  SpellBuilderReloadQuery,
  SpellBuilderReloadQueryVariables,
  UpdateSpellMutation,
  UpdateSpellMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mirrorKey, readMirror, writeMirror } from '@/lib/autosave';
import type { SpellBuilderProps, SpellBuilderValues } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The spell builder's autosave (M13.17): what it sends and to whom, and the
// banner offering back a copy kept in the browser. The save itself is the
// engine's, tests/lib/autosave/use-autosave.test.tsx.

const SPELL = {
  id: 's9',
  revision: 3,
  title: 'Fixture Working',
  intent: 'Calm',
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  visibility: 'private' as const,
  status: 'draft' as const,
  steps: [],
  updatedAt: '2026-10-27T14:00:00.000Z',
};
const KEY = mirrorKey({ entity: 'spell', id: 's9', userId: 'u1' });

function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" userId="u1" {...props} />
    </QueryClientProvider>,
  );
}

const field = (name: string) => screen.getByRole('textbox', { name });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });

function answer(id: string, revision: number, input: CreateSpellMutationVariables['input']) {
  return {
    id,
    revision,
    title: input.title ?? null,
    intent: input.intent ?? null,
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    steps: [],
    visibility: input.visibility ?? 'private',
    status: input.status ?? 'draft',
  };
}

function accept() {
  const created: CreateSpellMutationVariables[] = [];
  const updated: UpdateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>('CreateSpell', (v) => {
    created.push(v);
    return { createSpell: answer('s1', 1, v.input) };
  });
  mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>('UpdateSpell', (v) => {
    updated.push(v);
    return {
      updateSpell: answer(String(v.id), (v.input.expectedRevision ?? 0) + 1, v.input),
    };
  });
  return { created, updated };
}

const values = (over: Partial<SpellBuilderValues>): SpellBuilderValues => ({
  title: '',
  intent: '',
  jarDescription: '',
  sealWaxColor: '',
  moonPhase: '',
  dayOfWeek: '',
  note: '',
  visibility: 'private',
  status: 'draft',
  categoryIds: [],
  steps: [],
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  offerCategories([]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the spell builder’s saves', () => {
  it('creates once, then updates the spell it made at the revision it was answered', async () => {
    const { created, updated } = accept();
    renderBuilder();

    type('Title', 'Fixture Working');
    fireEvent.click(save());
    await waitFor(() => expect(created).toHaveLength(1));
    await waitFor(() => expect(save()).toBeDisabled());

    type('Intent', 'Calm');
    fireEvent.click(save());
    await waitFor(() => expect(updated).toHaveLength(1));
    expect(created).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: 's1', input: { expectedRevision: 1 } });
  });

  it('saves a draft with no title', async () => {
    const { created } = accept();
    renderBuilder();

    type('Intent', 'Calm');
    fireEvent.click(save());

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0].input.title).toBeNull();
  });
  it('still refuses a blank new instruction when Save is pressed, beside the instruction', async () => {
    const { created } = accept();
    renderBuilder();

    type('Title', 'Fixture Working');
    fireEvent.click(screen.getByRole('button', { name: 'Add Instruction' }));
    fireEvent.click(save());

    expect(await screen.findByText('Write the instruction, or remove it')).toBeInTheDocument();
    expect(created).toHaveLength(0);
  });

  it('leaves a blank new instruction out of the autosave, and Remove then takes it out cleanly', async () => {
    const { created } = accept();
    renderBuilder();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    type('Title', 'Fixture Working');
    fireEvent.click(screen.getByRole('button', { name: 'Add Instruction' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    // The rest of the spell saved; the blank row stayed, with nothing said about it.
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0].input.steps ?? []).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Failed|could not be saved/i)).toBeNull();

    // The new instruction is open, and an open row has no Remove: close it first.
    fireEvent.click(screen.getByRole('button', { name: 'Close step 1' }));
    fireEvent.click(screen.getByRole('button', { name: /^Remove/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Failed|could not be saved/i)).toBeNull();
  });

  it('holds the autosave back for a saved instruction cleared of its text, and Save then says why', async () => {
    const { updated } = accept();
    renderBuilder({
      spell: {
        ...SPELL,
        steps: [
          {
            id: '00000000-0000-4000-8000-0000000000a1',
            name: null,
            form: null,
            quantity: null,
            unit: null,
            body: 'Stir three times',
            ingredient: null,
            variant: null,
          },
        ],
      },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    fireEvent.click(screen.getByRole('button', { name: 'Jar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit step 1' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Instruction/ }), {
      target: { value: '' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    // Nothing was sent, and nothing is said.
    expect(updated).toHaveLength(0);
    expect(screen.queryByText('Write the instruction, or remove it')).toBeNull();
    expect(screen.queryByText(/Couldn.t save/i)).toBeNull();

    fireEvent.click(save());
    expect(await screen.findByText('Write the instruction, or remove it')).toBeInTheDocument();
    expect(updated).toHaveLength(0);
  });

  it('stores a new spell private on its first autosave, with nothing pressed', async () => {
    const { created } = accept();
    renderBuilder();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    type('Title', 'Fixture Working');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0].input.visibility).toBe('private');
  });

  it('saves a change by itself, three seconds after the last one', async () => {
    const { updated } = accept();
    renderBuilder({ spell: SPELL });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    type('Intent', 'Clear');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2900);
    });
    expect(updated).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0].input).toMatchObject({ intent: 'Clear', expectedRevision: 3 });
  });
});

describe('the recovery banner', () => {
  it('offers a copy newer than the saved spell, and Keep loads it', async () => {
    writeMirror(KEY, values({ title: 'Fixture Working', intent: 'From the mirror' }), new Date());
    renderBuilder({ spell: SPELL });

    expect(await screen.findByText(/^Restored unsaved changes from/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));

    expect(field('Intent')).toHaveValue('From the mirror');
    expect(screen.queryByText(/^Restored unsaved changes from/)).toBeNull();
    expect(save()).toBeEnabled();
  });

  it('forgets the copy on Discard and leaves the form as the server has it', async () => {
    writeMirror(KEY, values({ title: 'Fixture Working', intent: 'From the mirror' }), new Date());
    renderBuilder({ spell: SPELL });

    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));

    expect(readMirror(KEY)).toBeNull();
    expect(field('Intent')).toHaveValue('Calm');
    expect(screen.queryByText(/^Restored unsaved changes from/)).toBeNull();
  });

  it('says nothing of a copy older than the saved spell, and removes it', async () => {
    writeMirror(KEY, values({ intent: 'Old' }), new Date('2026-10-27T13:00:00.000Z'));
    renderBuilder({ spell: SPELL });

    await waitFor(() => expect(readMirror(KEY)).toBeNull());
    expect(screen.queryByText(/^Restored unsaved changes from/)).toBeNull();
  });
});

describe('a save someone else got in first (M13.18)', () => {
  /** Opens the saved spell, types an intent, and presses Save into a stale-write refusal. */
  async function conflict() {
    const sends = accept();
    mockGraphQLError('UpdateSpell', { code: 'STALE_WRITE', currentRevision: 5 });
    renderBuilder({ spell: SPELL });
    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    type('Intent', 'Mine');
    fireEvent.click(save());
    expect(await screen.findByText('This spell was changed elsewhere.')).toBeInTheDocument();
    return sends;
  }

  it('offers Reload Latest and Keep My Version, and Reload Latest puts the server’s spell in the form, clean', async () => {
    await conflict();
    expect(screen.getByRole('button', { name: 'Keep My Version' })).toBeInTheDocument();
    mockGraphQLQuery<SpellBuilderReloadQuery, SpellBuilderReloadQueryVariables>(
      'SpellBuilderReload',
      () => ({
        spell: {
          ...answer('s9', 5, { intent: 'Theirs', title: 'Fixture Working' }),
          categories: [],
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload Latest' }));

    await waitFor(() => expect(field('Intent')).toHaveValue('Theirs'));
    expect(screen.queryByText('This spell was changed elsewhere.')).toBeNull();
    // Clean: off for a reason it can say, so aria-disabled rather than disabled.
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  it('Keep My Version sends the form again against the revision the server is at', async () => {
    const { updated } = await conflict();
    // The refusal was the last handler added; an acceptance added now answers instead.
    mockGraphQLMutation<UpdateSpellMutation, UpdateSpellMutationVariables>('UpdateSpell', (v) => {
      updated.push(v);
      return { updateSpell: answer(String(v.id), (v.input.expectedRevision ?? 0) + 1, v.input) };
    });

    fireEvent.click(screen.getByRole('button', { name: 'Keep My Version' }));

    await waitFor(() => expect(updated[updated.length - 1]?.input.expectedRevision).toBe(5));
    expect(updated[updated.length - 1]?.input.intent).toBe('Mine');
    expect((await screen.findAllByText(/^Draft saved/)).length).toBeGreaterThan(0);
    expect(screen.queryByText('This spell was changed elsewhere.')).toBeNull();
  });
});
