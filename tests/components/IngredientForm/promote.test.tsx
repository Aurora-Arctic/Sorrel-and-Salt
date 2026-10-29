import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { PromoteFolkNameQuestion, usePromoteFolkName } from '@/components/IngredientForm/promote';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import type {
  PromoteFolkNameMutation,
  PromoteFolkNameMutationVariables,
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
} from '@/gql/graphql';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { duplicateHref, renderWithClient, textbox, waitFor } from '../../support/ingredient-form';
import { openSections } from '../../support/ingredient-sections';
import { press, type } from '../../support/interact';
import { ENTRY_ID, WORKSPACE_ID, offerNothing } from '../../support/msw/ingredient-lookups';

// Promoting a folk name: the control on a saved folk name's chip, the
// question it always asks, and what the form is left holding, tried on the
// compendium's edit; the coven tier is tried on the question and its hook,
// and the control on a coven's edit is coven-edit.test.tsx's.

const HEDGE_ID = '5a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c01';
const BANE_ID = '5a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c02';

/** Testwort with two saved folk names. */
const TESTWORT: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'none',
  folkNames: [
    { value: 'Hedge Fixture', id: HEDGE_ID },
    { value: 'Fixture Bane', id: BANE_ID },
  ],
};

/** The calls the mutations were sent, in the order they arrived. */
interface Sent {
  order: string[];
  promotes: PromoteFolkNameMutationVariables[];
  saves: UpdateCompendiumIngredientMutationVariables[];
}

/** The swap as the server does it: the new name in, the old one in the list. */
function acceptPromote(oldName = 'Testwort'): Sent {
  const sent: Sent = { order: [], promotes: [], saves: [] };
  mockGraphQLMutation<
    UpdateCompendiumIngredientMutation,
    UpdateCompendiumIngredientMutationVariables
  >('UpdateCompendiumIngredient', (variables) => {
    sent.order.push('save');
    sent.saves.push(variables);
    return {
      updateCompendiumIngredient: {
        id: String(variables.id),
        name: variables.input.name,
        slug: 'testwort',
      },
    };
  });
  mockGraphQLMutation<PromoteFolkNameMutation, PromoteFolkNameMutationVariables>(
    'PromoteFolkName',
    (variables) => {
      sent.order.push('promote');
      sent.promotes.push(variables);
      const promoted = variables.folkNameId === HEDGE_ID ? 'Hedge Fixture' : 'Fixture Bane';
      const other = variables.folkNameId === HEDGE_ID ? 'Fixture Bane' : 'Hedge Fixture';
      const otherId = variables.folkNameId === HEDGE_ID ? BANE_ID : HEDGE_ID;
      return {
        promoteFolkName: {
          id: String(variables.id),
          name: promoted,
          slug: 'hedge-fixture',
          folkNames: [
            { id: otherId, name: other },
            { id: 'a0000000-0000-4000-8000-000000000001', name: oldName },
          ],
        },
      };
    },
  );
  return sent;
}

function renderForm(props: { mayPromote?: boolean; values?: IngredientFormValues } = {}) {
  const { mayPromote = true, values = TESTWORT } = props;
  const onSaved = vi.fn();
  offerNothing();
  renderWithClient(
    <IngredientForm
      duplicateHref={duplicateHref}
      workspaceId={null}
      entry={{ id: ENTRY_ID, values }}
      mayPromote={mayPromote}
      onSaved={onSaved}
    />,
  );
  openSections('Identity');
  return { onSaved };
}

const promoteButton = (name: string) =>
  screen.queryByRole('button', { name: `Make ${name} the Display Name` });
const button = (name: string) => screen.getByRole('button', { name });
const noButton = (name: string) =>
  expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
const chip = (name: string) => screen.queryByRole('button', { name: `Remove ${name}` });

describe('promoting a folk name in the compendium form', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the control', () => {
    it('is on each saved folk name of a form that may promote', () => {
      renderForm();

      expect(promoteButton('Hedge Fixture')).toBeInTheDocument();
      expect(promoteButton('Fixture Bane')).toBeInTheDocument();
    });

    it('is absent without the prop', () => {
      renderForm({ mayPromote: false });

      expect(chip('Hedge Fixture')).toBeInTheDocument();
      expect(promoteButton('Hedge Fixture')).not.toBeInTheDocument();
    });

    it('is absent from a name typed and not yet saved', () => {
      renderForm();

      type('Folk Name', 'Fresh Fixture');
      fireEvent.click(screen.getByLabelText('Add Folk Name', { selector: 'button' }));

      expect(chip('Fresh Fixture')).toBeInTheDocument();
      expect(promoteButton('Fresh Fixture')).not.toBeInTheDocument();
      expect(promoteButton('Hedge Fixture')).toBeInTheDocument();
    });

    it('is absent from a new entry, which has nothing to promote on', () => {
      offerNothing();
      renderWithClient(
        <IngredientForm duplicateHref={duplicateHref} workspaceId={null} mayPromote />,
      );

      type('Folk Name', 'Fresh Fixture');
      fireEvent.click(screen.getByLabelText('Add Folk Name', { selector: 'button' }));

      expect(promoteButton('Fresh Fixture')).not.toBeInTheDocument();
    });
  });

  describe('on a clean form', () => {
    // Its Cancel is the question's own case, below.
    it('asks first, sending nothing until it is answered', async () => {
      const sent = acceptPromote();
      renderForm();

      press(promoteButton('Hedge Fixture') as HTMLElement);

      expect(button('Promote')).toBeInTheDocument();
      noButton('Save & Promote');
      expect(button('Cancel')).toHaveFocus();
      await act(async () => {});
      expect(sent.promotes).toHaveLength(0);
      expect(textbox('Name')).toHaveValue('Testwort');
    });

    it('sends one promotion on Promote, then shows the swapped names with nothing to save', async () => {
      const sent = acceptPromote();
      const { onSaved } = renderForm();

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Promote');

      await waitFor(() => expect(textbox('Name')).toHaveValue('Hedge Fixture'));
      expect(sent.promotes).toEqual([{ workspaceId: null, id: ENTRY_ID, folkNameId: HEDGE_ID }]);
      expect(sent.saves).toHaveLength(0);
      // The old display name is a folk name now, and the promoted one no longer is.
      expect(chip('Testwort')).toBeInTheDocument();
      expect(chip('Hedge Fixture')).not.toBeInTheDocument();
      expect(chip('Fixture Bane')).toBeInTheDocument();
      expect(button('Save Ingredient')).toBeDisabled();
      expect(
        screen
          .getAllByRole('status')
          .some((status) => status.textContent?.includes('Hedge Fixture')),
      ).toBe(true);
      expect(onSaved).toHaveBeenCalledOnce();
      expect(onSaved.mock.calls[0]?.[0]).toMatchObject({ id: ENTRY_ID, name: 'Hedge Fixture' });
      // The swap's new folk name is saved too, so it can be promoted straight back.
      expect(promoteButton('Testwort')).toBeInTheDocument();
    });

    it('shows a refusal in an alert, closes the question and leaves the form as it was', async () => {
      mockGraphQLError('PromoteFolkName', {
        code: 'VALIDATION',
        message: 'Another entry already claims that name.',
      });
      renderForm();

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Promote');

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      noButton('Promote');
      expect(textbox('Name')).toHaveValue('Testwort');
      expect(chip('Hedge Fixture')).toBeInTheDocument();
      expect(promoteButton('Hedge Fixture')).toBeEnabled();
    });
  });

  describe('on a form with changes', () => {
    it('offers to save or discard them first, and sends nothing on Cancel', async () => {
      const sent = acceptPromote();
      renderForm();
      type('Name', 'Testwort Renamed');

      press(promoteButton('Hedge Fixture') as HTMLElement);

      expect(button('Save & Promote')).toBeInTheDocument();
      expect(button('Discard & Promote')).toBeInTheDocument();
      noButton('Promote');
      press('Cancel');
      await act(async () => {});

      expect(sent.order).toEqual([]);
      expect(textbox('Name')).toHaveValue('Testwort Renamed');
    });

    it('saves the changes and then promotes, in that order', async () => {
      const sent = acceptPromote('Testwort Renamed');
      renderForm();
      type('Name', 'Testwort Renamed');

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Save & Promote');

      await waitFor(() => expect(textbox('Name')).toHaveValue('Hedge Fixture'));
      expect(sent.order).toEqual(['save', 'promote']);
      expect(sent.saves[0]?.input.name).toBe('Testwort Renamed');
      expect(sent.promotes).toEqual([{ workspaceId: null, id: ENTRY_ID, folkNameId: HEDGE_ID }]);
      expect(chip('Testwort Renamed')).toBeInTheDocument();
      expect(button('Save Ingredient')).toBeDisabled();
    });

    it('sends no promotion when the save is refused, and says where', async () => {
      const sent = acceptPromote();
      mockGraphQLError('UpdateCompendiumIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: 'That name is taken.' }],
      });
      renderForm();
      type('Name', 'Testwort Renamed');

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Save & Promote');

      await waitFor(() => expect(textbox('Name')).toBeInvalid());
      noButton('Save & Promote');
      expect(sent.promotes).toHaveLength(0);
      expect(textbox('Name')).toHaveFocus();
      expect(textbox('Name')).toHaveValue('Testwort Renamed');
    });

    it('sends no promotion when the changes are invalid, and saves nothing', async () => {
      const sent = acceptPromote();
      renderForm();
      type('Name', '   ');

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Save & Promote');

      await waitFor(() => expect(textbox('Name')).toBeInvalid());
      expect(sent.order).toEqual([]);
    });

    it('drops the changes and promotes, with no save sent', async () => {
      const sent = acceptPromote();
      renderForm();
      type('Name', 'Testwort Renamed');

      press(promoteButton('Hedge Fixture') as HTMLElement);
      press('Discard & Promote');

      await waitFor(() => expect(textbox('Name')).toHaveValue('Hedge Fixture'));
      expect(sent.order).toEqual(['promote']);
      // The old name is the saved one, not the typed one.
      expect(chip('Testwort')).toBeInTheDocument();
      expect(chip('Testwort Renamed')).not.toBeInTheDocument();
      expect(button('Save Ingredient')).toBeDisabled();
    });
  });
});

describe('the promotion question on its own, for either tier', () => {
  /** The question and the hook it runs on, for a tier, asking about one saved folk name. */
  function Harness({
    workspaceId,
    dirty = false,
  }: {
    workspaceId: string | null;
    dirty?: boolean;
  }) {
    const promotion = usePromoteFolkName(workspaceId, ENTRY_ID);
    const [asked, setAsked] = useState(true);
    return (
      <>
        <output>{asked ? 'asking' : 'closed'}</output>
        <PromoteFolkNameQuestion
          promotion={promotion}
          folkName={asked ? { id: BANE_ID, value: 'Fixture Bane' } : null}
          displayName="Testwort"
          tier={workspaceId === null ? 'compendium' : 'coven'}
          dirty={dirty}
          saveFirst={async () => true}
          discardFirst={() => {}}
          onPromoted={() => setAsked(false)}
          onKeep={() => setAsked(false)}
          onRefused={() => setAsked(false)}
        />
      </>
    );
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['the compendium', null],
    ['a coven', WORKSPACE_ID],
  ])('sends the one promotion for %s with its tier, ingredient and folk name', async (_, id) => {
    const sent = acceptPromote();
    renderWithClient(<Harness workspaceId={id} />);

    press('Promote');

    await waitFor(() => expect(sent.promotes).toHaveLength(1));
    expect(sent.promotes[0]).toEqual({ workspaceId: id, id: ENTRY_ID, folkNameId: BANE_ID });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('closed'));
  });

  it('sends nothing on Cancel, in a coven', async () => {
    const sent = acceptPromote();
    renderWithClient(<Harness workspaceId={WORKSPACE_ID} />);

    press('Cancel');

    await act(async () => {});
    expect(sent.promotes).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('closed');
  });
});
