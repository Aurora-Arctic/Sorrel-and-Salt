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
import { VISIBILITY_LABELS } from '@/components/GrimoireList/params';
import type { SpellBuilderProps, SpellBuilderSpell } from '@/components/SpellBuilder/types';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { offerCategories } from '../../support/msw/ingredient-lookups';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { default: SpellBuilder } = await import('@/components/SpellBuilder');

// The builder's category picker reads the categories as it opens.
beforeEach(() => offerCategories([]));

// The spell builder's visibility control: who can see the spell, its author alone or the whole coven, set at creation, widened once with a confirmation, and read-only once shared.
// That the service refuses a narrowing is tests/modules/grimoire/services/spells.test.ts's; here the builder shows that refusal's words in its notice.

// A saved spell opens with its sections shut, so each is opened with Open All, to reach the
// fields; the switch is the footer's and is reached either way.
function renderBuilder(props: Partial<SpellBuilderProps> = {}, { openAll = true } = {}) {
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <SpellBuilder workspaceId="w1" {...props} />
    </QueryClientProvider>,
  );
  if (props.spell && openAll) fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
  return view;
}

// A switch: on is the coven, off is private. It is named as the grimoire list names a shared spell.
const toggle = () => screen.getByRole('switch', { name: VISIBILITY_LABELS.workspace });
const save = () => screen.getByRole('button', { name: /^Sav/ });
const title = () => screen.getByRole('textbox', { name: 'Title' });
const submit = () => fireEvent.submit(save().closest('form') as HTMLFormElement);
// The question over the form: a group named by it (ConfirmOverlay).
const sharing = () => screen.queryByRole('group', { name: /^Share Fixture Working\?/ });

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

// The words the one-way visibility rule refuses a narrowing with (visibility-rule.ts).
const NARROWING_REFUSED =
  'This spell has been shared with the coven and cannot be made private again. ' +
  'Duplicate it to get a private copy you can change, or delete it if it should not be there.';

// The one-way rule binds a complete spell only; SPELL, with no status, is a draft.
const COMPLETE: SpellBuilderSpell = { ...SPELL, status: 'complete' };

describe('SpellBuilder visibility', () => {
  it('draws the switch in the footer beside Mark Complete, reached with every section shut', () => {
    renderBuilder({ spell: SPELL }, { openAll: false });
    // Why it could have been hidden: every section is shut, the note's with them.
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-expanded', 'false');

    expect(toggle()).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeVisible();
  });

  it('opens a new spell private, saying what each state means', () => {
    renderBuilder();

    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(toggle()).toHaveAccessibleDescription(/only you/i);

    fireEvent.click(toggle());

    expect(toggle()).toBeChecked();
    expect(toggle()).toHaveAccessibleDescription(/^The coven can see it\./);
  });

  it('creates the spell private when nothing else is chosen', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.change(title(), { target: { value: 'Fixture Working' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ visibility: 'private' });
  });

  it('creates the spell for the coven when the switch is turned on', async () => {
    const calls = acceptCreate();
    renderBuilder();

    fireEvent.click(toggle());
    fireEvent.change(title(), { target: { value: 'Fixture Working' } });
    submit();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ visibility: 'workspace' });
    await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
    // Still a draft, so the switch stays free.
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
  });

  // A choice of who can see it is something to save.
  it('has something to save once only the choice has changed, and nothing once it is back', () => {
    renderBuilder();
    // Why Save could stay off: no field holds anything.
    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);

    fireEvent.click(toggle());

    expect(toggle()).toBeChecked();
    expect(save()).toBeEnabled();

    fireEvent.click(toggle());

    expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true);
  });

  describe('a complete private spell', () => {
    it('asks before sharing it, and Keep It Private sends nothing', () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: COMPLETE });
      expect(toggle()).not.toBeChecked();

      fireEvent.click(toggle());

      const question = sharing();
      // The question names the spell, then says in one sentence what sharing does.
      expect(question).toHaveTextContent(
        'Share Fixture Working? Every member of the coven will see it, it cannot be made private again, and your other changes are saved with it.',
      );
      fireEvent.click(
        within(question as HTMLElement).getByRole('button', { name: 'Keep It Private' }),
      );

      expect(sharing()).toBeNull();
      expect(toggle()).not.toBeChecked();
      expect(calls).toHaveLength(0);
    });

    it('is shared in one action once confirmed, and the control then reads only', async () => {
      const calls = acceptUpdate();
      renderBuilder({ spell: COMPLETE });

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
      renderBuilder({ spell: COMPLETE });

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
    // ; the builder says why in the server's words.
    it('shows a refused narrowing in the notice, in words that explain it', async () => {
      mockGraphQLError('UpdateSpell', { code: 'FORBIDDEN', message: NARROWING_REFUSED });
      renderBuilder({ spell: COMPLETE });
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

  describe('a complete spell shared with the coven', () => {
    it('opens the control read-only, saying why and naming Duplicate', () => {
      renderBuilder({ spell: { ...COMPLETE, visibility: 'workspace' } });

      expect(toggle()).toBeChecked();
      expect(toggle()).toBeDisabled();
      expect(toggle()).toHaveAccessibleDescription(/cannot be made private/i);
      expect(toggle()).toHaveAccessibleDescription(/Duplicate/);
    });

    it('stays free to switch off once a new spell is saved shared, for it is a draft', async () => {
      acceptCreate();
      renderBuilder();

      fireEvent.click(toggle());
      fireEvent.change(title(), { target: { value: 'Fixture Working' } });
      submit();

      await waitFor(() => expect(save().matches(':disabled, [aria-disabled="true"]')).toBe(true));
      expect(toggle()).toBeChecked();
      expect(toggle()).toBeEnabled();
      expect(toggle()).toHaveAccessibleDescription(/once the spell is complete, it stays shared/i);
    });
  });
});

describe('SpellBuilder visibility on a saved draft', () => {
  it('switches a shared draft off and on with no question, saved with the rest', async () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: { ...SPELL, visibility: 'workspace' } });
    // Why it could have been shut: it is saved and shared, and only its status keeps it open.
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();

    fireEvent.click(toggle());

    expect(sharing()).toBeNull();
    expect(toggle()).not.toBeChecked();
    expect(save()).toBeEnabled();
    fireEvent.click(toggle());
    expect(sharing()).toBeNull();
    expect(toggle()).toBeChecked();
    expect(calls).toHaveLength(0);
  });

  it('shares a private draft with no question, sending nothing until it is saved', () => {
    const calls = acceptUpdate();
    renderBuilder({ spell: SPELL });
    expect(toggle()).not.toBeChecked();

    fireEvent.click(toggle());

    expect(sharing()).toBeNull();
    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(toggle()).toHaveAccessibleDescription(/once the spell is complete, it stays shared/i);
    expect(calls).toHaveLength(0);
  });
});
