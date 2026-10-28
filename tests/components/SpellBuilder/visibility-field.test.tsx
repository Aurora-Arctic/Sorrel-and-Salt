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
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The builder's category picker (M10.14) reads the categories as it opens.
beforeEach(() => offerCategories([]));

// The spell builder's visibility control (M10.13): who can see the spell, its
// author alone or the whole coven, set at creation, widened once with a
// confirmation, and read-only once shared. That the service refuses a
// narrowing is tests/modules/grimoire/services/spells.test.ts's (M10.6); here
// the builder shows that refusal's words in its notice.

// A saved spell opens with its sections shut (M10.12), so each is opened
// with Open All, as a person reaches the switch in Notes.
function renderBuilder(props: Partial<SpellBuilderProps> = {}) {
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
  if (props.spell) fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

// A switch (the owner's call, 2026-10-27): on is the coven, off is private.
const toggle = () => screen.getByRole('switch', { name: 'Share With the Coven' });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const title = () => screen.getByRole('textbox', { name: 'Title' });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);
// The question over the form: a group named by it (ConfirmOverlay).
const sharing = () => screen.queryByRole('group', { name: /Share With the Coven/ });

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
  visibility: 'private',
  steps: [],
};

/** The spell as the server answers a save: every field as sent, at `revision`. */
function answer(
  id: string,
  revision: number,
  input: CreateSpellMutationVariables['input'],
  visibility: SpellBuilderSpell['visibility'],
) {
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
    visibility: input.visibility ?? visibility,
    status: input.status ?? 'draft',
    steps: [],
  };
}

function acceptCreate() {
  const calls: CreateSpellMutationVariables[] = [];
  mockGraphQLMutation<CreateSpellMutation, CreateSpellMutationVariables>(
    'CreateSpell',
    (variables) => {
      calls.push(variables);
      return { createSpell: answer('s1', 1, variables.input, 'workspace') };
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
          'private',
        ),
      };
    },
  );
  return calls;
}

// The words M10.6's one-way rule refuses a narrowing with (visibility-rule.ts).
const NARROWING_REFUSED =
  'This spell has been shared with the coven and cannot be made private again. ' +
  'Delete it instead if it should not be there.';

describe('SpellBuilder visibility', () => {
  it('opens a new spell shared with the coven, saying what each state means', () => {
    renderBuilder();

    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(toggle()).toHaveAccessibleDescription(/every member/i);

    fireEvent.click(toggle());

    expect(toggle()).not.toBeChecked();
    expect(toggle()).toHaveAccessibleDescription(/only you/i);
  });

  it('creates the spell for the coven when nothing else is chosen', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.change(title(), { target: { value: 'Fixture Working' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ visibility: 'workspace' });
  });

  it('creates the spell private when the switch is turned off, and keeps the choice open', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.click(toggle());
    fireEvent.change(title(), { target: { value: 'Fixture Working' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ visibility: 'private' });
    await waitFor(() => expect(save()).toBeDisabled());
    // Still private, and still free to be shared.
    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeEnabled();
  });

  // A choice of who can see it is something to save (the owner's call, 2026-10-27).
  it('has something to save once only the choice has changed, and nothing once it is back', () => {
    renderBuilder();
    // Why Save could stay off: no field holds anything.
    expect(save()).toBeDisabled();

    fireEvent.click(toggle());

    expect(toggle()).not.toBeChecked();
    expect(save()).toBeEnabled();

    fireEvent.click(toggle());

    expect(save()).toBeDisabled();
  });

  describe('a private spell', () => {
    it('asks before sharing it, and Keep It Private sends nothing', () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: SPELL });
      expect(toggle()).not.toBeChecked();

      fireEvent.click(toggle());

      const question = sharing();
      expect(question).toBeInTheDocument();
      fireEvent.click(
        within(question as HTMLElement).getByRole('button', { name: 'Keep It Private' }),
      );

      expect(sharing()).toBeNull();
      expect(toggle()).not.toBeChecked();
      expect(calls).toHaveLength(0);
    });

    it('is shared in one action once confirmed, and the control then reads only', async () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: SPELL });

      fireEvent.click(toggle());
      fireEvent.click(within(sharing() as HTMLElement).getByRole('button', { name: 'Share' }));

      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toMatchObject({
        workspaceId: 'w1',
        id: 's3',
        input: { visibility: 'workspace', expectedRevision: 4 },
      });
      await waitFor(() => expect(sharing()).toBeNull());
      expect(toggle()).toBeChecked();
      expect(toggle()).toBeDisabled();
    });

    it('stays private when the share is refused, with the refusal in the notice', async () => {
      mockGraphQLError('UpdateSpell', {
        code: 'FORBIDDEN',
        message: 'Viewers cannot write spells',
      });
      renderBuilder({ spell: SPELL });

      fireEvent.click(toggle());
      fireEvent.click(within(sharing() as HTMLElement).getByRole('button', { name: 'Share' }));

      expect(await screen.findByText('Viewers cannot write spells')).toHaveAttribute(
        'role',
        'alert',
      );
      await waitFor(() => expect(sharing()).toBeNull());
      expect(toggle()).not.toBeChecked();
      expect(toggle()).toBeEnabled();
    });

    // The spell was shared from elsewhere since this builder read it, so this
    // save, still saying private, would narrow it. The service refuses it
    // (M10.6); the builder says why in the server's words.
    it('shows a refused narrowing in the notice, in words that explain it', async () => {
      mockGraphQLError('UpdateSpell', { code: 'FORBIDDEN', message: NARROWING_REFUSED });
      renderBuilder({ spell: SPELL });
      // Why the save could have gone through: the builder holds the spell as
      // private, and the save carries that choice.
      expect(toggle()).not.toBeChecked();

      fireEvent.change(title(), { target: { value: 'Fixture Working Again' } });
      submit();

      const notice = await screen.findByText(NARROWING_REFUSED);
      expect(notice).toHaveAttribute('role', 'alert');
      expect(notice).not.toHaveTextContent(/^Forbidden$/);
    });
  });

  describe('a spell shared with the coven', () => {
    it('opens the control read-only, saying why and naming Duplicate', () => {
      renderBuilder({ spell: { ...SPELL, visibility: 'workspace' } });

      expect(toggle()).toBeChecked();
      expect(toggle()).toBeDisabled();
      expect(toggle()).toHaveAccessibleDescription(/cannot be made private/i);
      expect(toggle()).toHaveAccessibleDescription(/Duplicate/);
    });

    it('becomes read-only once a new spell is saved for the coven', async () => {
      acceptCreate();
      renderBuilder();

      fireEvent.change(title(), { target: { value: 'Fixture Working' } });
      submit();

      await waitFor(() => expect(toggle()).toBeDisabled());
      expect(toggle()).toHaveAccessibleDescription(/Duplicate/);
    });
  });
});
