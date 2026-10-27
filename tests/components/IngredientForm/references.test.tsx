import { act, fireEvent, screen, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import { ReferencesField } from '@/components/IngredientForm/references';
import type { IngredientFormInput, IngredientFormValues } from '@/components/IngredientForm/types';
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  ingredientResolver,
} from '@/components/IngredientForm/values';
import { DEBOUNCE_MS } from '@/lib/debounce';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import {
  chooseKind,
  inPanel,
  labelled,
  referencePanel,
  renderWithClient,
  waitFor,
  duplicateHref,
} from '../../support/ingredient-form';
import { press, redo, typeIn, undo } from '../../support/interact';
import { mockGraphQLError } from '../../support/msw/graphql';
import {
  NEW_REFERENCE_ID,
  WORKSPACE_ID,
  acceptCreate,
  acceptReference,
  acceptReferenceUpdate,
  offerNothing,
  offerReference,
  offerReferences,
} from '../../support/msw/ingredient-lookups';
import type { ReferenceNode } from './types';

// The References field (MB.154) on its own (MB.182): `ReferencesField`, a
// search over `referenceSuggestions`, each source picked becoming a row
// beneath the box with its locator, and the new reference panel opened
// beneath it, in a form of its own on the form's resolver; what the resolver
// hands the submit is what the form sends. The panel's own behaviours are
// reference-panel.test.tsx's, and the search's debounce is lookups.test.tsx's
// and tests/lib/debounce.test.tsx's; what needs the whole form — the payload
// sent and cleared, and a server's error routed to a row — is at the end
// (claude-docs/components/ingredient-form.md, "Testing").

const COMPENDIUM_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const COVEN_ID = '6f5e4d3c-2b1a-4f9e-8d7c-6b5a4f3e2d1c';

// Invented sources (M1.25): a real title is only safe until someone seeds it.
const HERBAL: ReferenceNode = {
  id: COMPENDIUM_ID,
  citation: 'Fixture, Ada. The Testwort Herbal. Mockford: Fixture Press, 1901.',
  isGlobal: true,
  kind: 'book',
  authors: 'Fixture, Ada',
  title: 'The Testwort Herbal',
  container: null,
};
const NOTES: ReferenceNode = {
  id: COVEN_ID,
  citation: 'Placeholder, Bram. "Notes on Mockleaf." Journal of Fixtures 3 (1950): 12–19.',
  isGlobal: false,
  kind: 'article',
  authors: 'Placeholder, Bram',
  title: 'Notes on Mockleaf',
  container: 'Journal of Fixtures',
};
// Each one's Chicago short form, which its row shows and its buttons are named by.
const HERBAL_SHORT = 'Fixture, Testwort Herbal';
const NOTES_SHORT = 'Placeholder, "Notes on Mockleaf"';

/** The field in a form of its own, its name given; the submit receives what the form would send. */
function renderField() {
  const onSubmit = vi.fn();
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: { ...EMPTY_VALUES, name: 'Testwort' },
      resolver: ingredientResolver,
    });
    return (
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <ReferencesField workspaceId={WORKSPACE_ID} />
          <button type="submit">Save Ingredient</button>
        </form>
      </FormProvider>
    );
  };
  renderWithClient(<Harness />);
  return onSubmit;
}

/** The whole form, every lookup answered empty, as index.test.tsx renders it. */
function renderForm() {
  const onSaved = vi.fn();
  offerNothing();
  renderWithClient(
    <IngredientForm duplicateHref={duplicateHref} workspaceId={WORKSPACE_ID} onSaved={onSaved} />,
  );
  return onSaved;
}

// Found by label rather than by role and name, so the whole form's tests
// below do not name every element of a role in a 25-field form (MB.181).
const box = () => screen.getByLabelText('Reference', { selector: '[role="combobox"]' });
const references = () => box().closest('fieldset') as HTMLElement;
const rows = () => within(references()).queryAllByRole('listitem');
/** A row by its citation, whole or short: an open row shows it whole, and its Edit is named by the short form. */
const row = (citation: string) =>
  rows().find(
    (item) =>
      item.textContent?.includes(citation) ||
      within(item).queryByRole('button', { name: `Edit ${citation}` }) !== null,
  ) ??
  (() => {
    throw new Error(`No row for ${citation}`);
  })();
/**
 * What a row's line shows a sighted reader: its text less every hidden
 * element's, and less a pencil's tip, which the press that opens or shuts
 * the row leaves showing over it.
 */
const shownIn = (item: HTMLElement) => {
  const copy = item.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[hidden], [role="tooltip"]').forEach((node) => node.remove());
  return copy.textContent;
};
const changes = () => within(references()).getByRole('status', { name: 'References changes' });
const panel = () => referencePanel(references());
const noPanel = () =>
  expect(within(references()).queryByRole('group', { name: 'New Reference' })).toBeNull();
const kindBox = () => within(panel()).getByRole('combobox', { name: 'Kind' });
const nameBox = () => screen.getByLabelText(labelled('Name'), { selector: 'input' });
/** The harness's save, or the form's, by name. */
const saveButton = (name = 'Save Ingredient') => screen.getByRole('button', { name });
const save = () => press(saveButton());
/** Opens the box's list and picks its last row, New Reference, which opens the panel. */
const newReference = () => {
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('option', { name: 'New Reference' }));
};
/** The row's Locator, once its edit has opened the row; `short` names the row's source. */
const locatorOf = (short: string) => {
  const inRow = within(row(short));
  const edit = inRow.getByRole('button', { name: `Edit ${short}` });
  if (edit.getAttribute('aria-expanded') !== 'true') press(edit);
  return inRow.getByRole('textbox', { name: 'Locator' });
};

const settle = () => act(() => vi.advanceTimersByTime(DEBOUNCE_MS));
/** Focuses the box, waits for its first, empty ask, then types `text` and lets it settle. */
async function lookUp(calls: unknown[], text: string) {
  act(() => box().focus());
  await waitFor(() => expect(calls).toHaveLength(1));
  typeIn(box(), text);
  settle();
  await waitFor(() => expect(calls).toHaveLength(2));
}
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const option = (citation: string) =>
  screen.findByRole('option', { name: new RegExp(`^${escapeRegExp(citation)}`) });
/** Looks up `text` and picks the source reading `citation` by click. */
async function pick(calls: unknown[], text: string, citation: string) {
  await lookUp(calls, text);
  fireEvent.click(await option(citation));
}
/** Picks HERBAL, then NOTES from the list reopened. */
async function pickBoth(calls: unknown[]) {
  await pick(calls, 'fixture', HERBAL.citation);
  fireEvent.keyDown(box(), { key: 'ArrowDown' });
  fireEvent.click(await option(NOTES.citation));
}

describe('ReferencesField', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the search', () => {
    it('asks about this coven once the box is used, and not before', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      settle();
      expect(calls).toHaveLength(0);

      await lookUp(calls, 'testwort');
      expect(calls[0]).toMatchObject({ workspaceId: WORKSPACE_ID });
      expect(calls[1]).toMatchObject({ workspaceId: WORKSPACE_ID, query: 'testwort' });
    });

    it('offers each source by its citation and whose it is, in the order found, then "New Reference" last', async () => {
      renderField();
      const calls = offerReferences([NOTES, HERBAL]);

      await lookUp(calls, 'fixture');

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        `${NOTES.citation}This coven’s source`,
        `${HERBAL.citation}Compendium source`,
        'New Reference',
      ]);
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('does not offer a source already listed', async () => {
      renderField();
      const calls = offerReferences([HERBAL, NOTES]);

      await pick(calls, 'fixture', HERBAL.citation);
      fireEvent.keyDown(box(), { key: 'ArrowDown' });

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
      expect(
        screen.queryByRole('option', { name: new RegExp(escapeRegExp(HERBAL.citation)) }),
      ).toBe(null);
    });
  });

  describe('the list', () => {
    it('adds a picked source as a row beneath the box reading its short form, and announces it', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      expect(rows()).toHaveLength(1);
      expect(changes()).toHaveTextContent(HERBAL_SHORT);
      expect(box()).toHaveValue('');
      // The new row opens on its Locator, a page being what it most often needs next (MB.115).
      const inRow = within(row(HERBAL_SHORT));
      expect(inRow.getByRole('button', { name: `Edit ${HERBAL_SHORT}` })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(inRow.getByRole('textbox', { name: 'Locator' })).toHaveFocus();
    });

    it('shows a row as its short form, then its locator, described by its whole citation', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const item = row(HERBAL_SHORT);
      const inRow = within(item);
      const edit = inRow.getByRole('button', { name: `Edit ${HERBAL_SHORT}` });
      expect(edit).toHaveAccessibleDescription(HERBAL.citation);
      expect(
        inRow.getByRole('button', { name: `Remove ${HERBAL_SHORT}` }),
      ).toHaveAccessibleDescription(HERBAL.citation);

      // Open, as it is added, the row reads the citation whole; closed, its locator follows.
      typeIn(locatorOf(HERBAL_SHORT), 'p. 112');
      expect(shownIn(item)).toContain(HERBAL.citation);
      press(edit);
      expect(shownIn(item)).toBe(`${HERBAL_SHORT}, p. 112`);
    });

    it('opens a row as it is added, then keeps it to one line until its edit opens it on its Locator again', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const inRow = within(row(HERBAL_SHORT));
      const edit = inRow.getByRole('button', { name: `Edit ${HERBAL_SHORT}` });
      expect(edit).toHaveAttribute('aria-expanded', 'true');

      press(edit);
      expect(edit).toHaveAttribute('aria-expanded', 'false');
      expect(inRow.queryByRole('textbox', { name: 'Locator' })).toBeNull();

      press(edit);
      expect(edit).toHaveAttribute('aria-expanded', 'true');
      expect(inRow.getByRole('textbox', { name: 'Locator' })).toHaveFocus();
    });

    it("gives each row a locator, labelled and read with its source's citation and the tip beside it", async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);

      const inRow = within(row(HERBAL.citation));
      const locator = locatorOf(HERBAL_SHORT);
      expect(locator).toHaveAccessibleDescription(expect.stringContaining(HERBAL.citation));
      expect(inRow.getByRole('button', { name: 'About Locator' })).toBeInTheDocument();
    });

    // Its × asks first, as a variant's does (the owner's call, 2026-10-16).
    it('removes a row by its × once confirmed, keeping the focus in the box, and says so', async () => {
      renderField();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      press(within(references()).getByRole('button', { name: `Remove ${HERBAL_SHORT}` }));

      expect(rows()).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Keep It' })).toHaveFocus();
      press(screen.getByRole('button', { name: 'Remove' }));

      expect(rows()).toHaveLength(1);
      expect(row(NOTES.citation)).toBeInTheDocument();
      expect(changes()).toHaveTextContent(HERBAL_SHORT);
      expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
      expect(box()).toHaveFocus();
    });

    it('keeps a row, and the focus on its ×, when its removal is answered Keep It', async () => {
      renderField();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      const remove = within(references()).getByRole('button', { name: `Remove ${HERBAL_SHORT}` });
      press(remove);
      press(screen.getByRole('button', { name: 'Keep It' }));

      expect(rows()).toHaveLength(2);
      expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
      expect(remove).toHaveFocus();
    });

    // Unlike the chip lists, the keys never take a row, asked or not: only
    // its ×, which asks (the owner's call, 2026-10-16).
    it('keeps every row on Backspace or Delete in the empty box, and asks nothing', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const said = changes().textContent;
      fireEvent.keyDown(box(), { key: 'Backspace' });
      fireEvent.keyDown(box(), { key: 'Delete' });

      expect(rows()).toHaveLength(1);
      expect(changes()).toHaveTextContent(said ?? '');
      expect(screen.queryByRole('button', { name: 'Keep It' })).toBeNull();
    });

    it('never submits the ingredient on Enter in the box with nothing picked', async () => {
      const onSubmit = renderField();
      offerReferences([]);

      typeIn(box(), 'fixture');
      const enter = fireEvent.keyDown(box(), { key: 'Enter' });

      expect(enter).toBe(false);
      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(rows()).toHaveLength(0);
    });
  });

  describe('what it sends', () => {
    it('tidies a locator as it is left, its ranges dashed, several places in one', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'testwort', HERBAL.citation);
      const locator = locatorOf(HERBAL_SHORT);
      typeIn(locator, ' pp. 12-19,   40; chap. 3 ');
      fireEvent.blur(locator);

      expect(locator).toHaveValue('pp. 12–19, 40; chap. 3');
    });

    it('refuses a save while the box holds a search, until it is cleared', async () => {
      const onSubmit = renderField();
      offerReferences([]);

      typeIn(box(), 'testwort');
      save();

      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(expect.stringContaining('testwort'));
      expect(onSubmit).not.toHaveBeenCalled();

      typeIn(box(), '');
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });
  });

  describe('the new reference panel', () => {
    // The panel's own Kind box looks references up as soon as it opens; a
    // test that cares what comes back overrides this.
    beforeEach(() => {
      offerReferences([]);
    });

    // The owner's call: asking again for a panel already open takes you
    // back to it, rather than doing nothing; that the panel then focuses
    // Kind and keeps what was typed is reference-panel.test.tsx's.
    it('opens from the list’s last row, "New Reference", taking you to Kind, and again while open', async () => {
      renderField();
      const calls = offerReferences([HERBAL]);
      noPanel();

      newReference();
      expect(panel()).toBeInTheDocument();
      expect(kindBox()).toHaveFocus();

      await lookUp(calls, 'testwort');
      fireEvent.click(await screen.findByRole('option', { name: 'New Reference' }));
      expect(kindBox()).toHaveFocus();
    });

    it('lists a new source saved to this coven by its id, closing, the new row open on its Locator', async () => {
      const calls = acceptReference();
      const onSubmit = renderField();
      newReference();

      chooseKind('Book', references());
      typeIn(inPanel('Title', references()), 'A Fixture Grimoire');
      typeIn(inPanel('Published', references()), '1999');
      press(within(panel()).getByRole('button', { name: 'Save Reference' }));

      await waitFor(noPanel);
      expect(calls).toHaveLength(1);
      expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
      // Shown by its short form, as a source picked is.
      const short = 'Mock, Fixture Grimoire';
      expect(changes()).toHaveTextContent(short);
      expect(within(row(short)).getByRole('textbox', { name: 'Locator' })).toHaveFocus();

      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].references).toEqual([
        { referenceId: NEW_REFERENCE_ID, locator: '' },
      ]);
    });

    it('closes on Cancel, adding nothing, the focus back in the box', () => {
      const calls = acceptReference();
      renderField();
      newReference();

      chooseKind('Book', references());
      press(within(panel()).getByRole('button', { name: 'Cancel' }));

      noPanel();
      expect(rows()).toHaveLength(0);
      expect(calls).toHaveLength(0);
      expect(box()).toHaveFocus();
    });

    it('stops the ingredient save while it is open, until it is saved or cancelled', async () => {
      const onSubmit = renderField();
      newReference();

      save();

      await waitFor(() => expect(box()).toBeInvalid());
      expect(onSubmit).not.toHaveBeenCalled();

      press(within(panel()).getByRole('button', { name: 'Cancel' }));
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });
  });

  // MB.115: an open row's Edit Source opens the panel on that source whole,
  // and its save rewrites every row citing it. The rows start listed, the
  // ingredient's and a variant's citing the same source, as an edit opens them.
  describe('editing a source', () => {
    /** NOTES whole, as `reference` answers it. */
    const NOTES_WHOLE = {
      id: COVEN_ID,
      kind: 'article',
      title: 'Notes on Mockleaf',
      authors: 'Placeholder, Bram',
      container: 'Journal of Fixtures',
      contributors: null,
      edition: null,
      volume: '3',
      issue: null,
      series: null,
      place: null,
      publisher: null,
      published: '1950',
      pages: '12–19',
      host: null,
      url: null,
      modified: null,
      accessed: null,
      note: null,
    } as const;
    const RENAMED_CITATION =
      'Placeholder, Bram. "Notes on Fixtureleaf." Journal of Fixtures 3 (1950): 12–19.';
    const RENAMED_SHORT = 'Placeholder, "Notes on Fixtureleaf"';

    const entryOf = ({ citation, ...link }: ReferenceNode) => ({
      value: citation,
      link,
      locator: '',
    });

    /** The ingredient's references and its one variant's, each citing `sources`, in a form of their own. */
    function renderListed(sources: ReferenceNode[], workspaceId: string | null = WORKSPACE_ID) {
      const onSubmit = vi.fn();
      const Harness = () => {
        const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
          defaultValues: {
            ...EMPTY_VALUES,
            name: 'Testwort',
            references: sources.map(entryOf),
            variants: [{ ...EMPTY_VARIANT, form: 'Oil', references: sources.map(entryOf) }],
          },
          resolver: ingredientResolver,
        });
        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              <ReferencesField workspaceId={workspaceId} />
              <ReferencesField workspaceId={workspaceId} at="variants.0" />
              <button type="submit">Save Ingredient</button>
            </form>
          </FormProvider>
        );
      };
      renderWithClient(<Harness />);
      return onSubmit;
    }

    const [ingredient, variant] = [0, 1].map(
      (at) => () => screen.getAllByRole('group', { name: 'References' })[at],
    );
    const editPanel = () => within(ingredient()).getByRole('group', { name: 'Edit Source' });
    const noEditPanel = () =>
      expect(within(ingredient()).queryByRole('group', { name: 'Edit Source' })).toBeNull();
    const inEditPanel = (label: string) => within(editPanel()).getByLabelText(labelled(label));
    /** Opens the ingredient's row for `short` by its pencil, if it is not open. */
    const openRow = (short: string) => {
      const pencil = within(ingredient()).getByRole('button', { name: `Edit ${short}` });
      if (pencil.getAttribute('aria-expanded') !== 'true') press(pencil);
    };
    const editSource = (short: string) =>
      within(ingredient()).queryByRole('button', { name: `Edit Source ${short}` });
    /** Opens the row and its Edit Source, and waits for the panel to read the source. */
    async function openEdit(short: string) {
      openRow(short);
      press(editSource(short) as HTMLElement);
      await waitFor(() => expect(inEditPanel('Article Title')).toBeInTheDocument());
    }

    it('opens the panel on an own source, prefilled with every field it has, read in its coven', async () => {
      const reads = offerReference(NOTES_WHOLE);
      renderListed([NOTES]);

      await openEdit(NOTES_SHORT);

      expect(reads).toEqual([{ workspaceId: WORKSPACE_ID, id: COVEN_ID }]);
      expect(inEditPanel('Article Title')).toHaveValue('Notes on Mockleaf');
      expect(inEditPanel('Journal')).toHaveValue('Journal of Fixtures');
      expect(inEditPanel('Authors')).toHaveValue('Placeholder, Bram');
      expect(inEditPanel('Volume')).toHaveValue('3');
      expect(inEditPanel('Issue')).toHaveValue('');
      expect(inEditPanel('Published')).toHaveValue('1950');
      expect(inEditPanel('Pages')).toHaveValue('12–19');
      // Nothing to save until something changes.
      expect(within(editPanel()).getByRole('button', { name: 'Save Source' })).toBeDisabled();
    });

    it('saves through updateReference by id in its tier, rewriting every row citing it, the focus back on the row', async () => {
      offerReference(NOTES_WHOLE);
      const updates = acceptReferenceUpdate(RENAMED_CITATION);
      const onSubmit = renderListed([NOTES]);
      await openEdit(NOTES_SHORT);

      typeIn(inEditPanel('Article Title'), 'Notes on Fixtureleaf');
      press(within(editPanel()).getByRole('button', { name: 'Save Source' }));

      await waitFor(noEditPanel);
      expect(updates).toEqual([
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          id: COVEN_ID,
          input: expect.objectContaining({ kind: 'article', title: 'Notes on Fixtureleaf' }),
        }),
      ]);
      // The ingredient's row and the variant's both read the new short form.
      for (const list of [ingredient(), variant()]) {
        expect(within(list).getByRole('button', { name: `Edit ${RENAMED_SHORT}` })).toBeVisible();
        expect(within(list).queryByRole('button', { name: `Edit ${NOTES_SHORT}` })).toBeNull();
      }
      expect(
        within(ingredient()).getByRole('status', { name: 'References changes' }),
      ).not.toBeEmptyDOMElement();
      expect(editSource(RENAMED_SHORT)).toHaveFocus();

      // The links sent are as they were: the source was saved already.
      save();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].references).toEqual([
        { referenceId: COVEN_ID, locator: '' },
      ]);
    });

    it('closes on Cancel, saving nothing, the focus back on the row', async () => {
      offerReference(NOTES_WHOLE);
      const updates = acceptReferenceUpdate(RENAMED_CITATION);
      renderListed([NOTES]);
      await openEdit(NOTES_SHORT);

      typeIn(inEditPanel('Article Title'), 'Notes on Fixtureleaf');
      press(within(editPanel()).getByRole('button', { name: 'Cancel' }));

      noEditPanel();
      expect(updates).toHaveLength(0);
      expect(editSource(NOTES_SHORT)).toHaveFocus();
    });

    // MB.258: the × at the panel's top closes it as Cancel does.
    it('closes from its close button, saving nothing, the focus back on the row', async () => {
      offerReference(NOTES_WHOLE);
      const updates = acceptReferenceUpdate(RENAMED_CITATION);
      renderListed([NOTES]);
      await openEdit(NOTES_SHORT);

      typeIn(inEditPanel('Article Title'), 'Notes on Fixtureleaf');
      press(within(editPanel()).getByRole('button', { name: 'Close Edit Source' }));

      noEditPanel();
      expect(updates).toHaveLength(0);
      // The row still cites the source as it was.
      expect(
        within(ingredient()).queryByRole('button', { name: `Edit ${RENAMED_SHORT}` }),
      ).toBeNull();
      expect(editSource(NOTES_SHORT)).toHaveFocus();
    });

    // Why it could have been offered: the coven's own source, beside it, is.
    it('offers no edit of a compendium source in a coven’s form', () => {
      renderListed([HERBAL, NOTES]);

      openRow(NOTES_SHORT);
      expect(editSource(NOTES_SHORT)).toBeVisible();
      openRow(HERBAL_SHORT);

      expect(editSource(HERBAL_SHORT)).toBeNull();
    });

    it('edits a compendium source in the compendium’s form, in the compendium’s tier', async () => {
      const reads = offerReference({
        ...NOTES_WHOLE,
        id: COMPENDIUM_ID,
        kind: 'book',
        title: 'The Testwort Herbal',
        authors: 'Fixture, Ada',
        container: null,
        volume: null,
        pages: null,
        place: 'Mockford',
        publisher: 'Fixture Press',
        published: '1901',
      });
      const updates = acceptReferenceUpdate(
        'Fixture, Ada. The Testwort Herbal. 2nd ed. Mockford: Fixture Press, 1901.',
      );
      renderListed([HERBAL], null);
      openRow(HERBAL_SHORT);
      press(editSource(HERBAL_SHORT) as HTMLElement);
      await waitFor(() => expect(inEditPanel('Title')).toHaveValue('The Testwort Herbal'));

      typeIn(inEditPanel('Edition'), '2nd ed.');
      press(within(editPanel()).getByRole('button', { name: 'Save Source' }));

      await waitFor(noEditPanel);
      expect(reads).toEqual([{ workspaceId: null, id: COMPENDIUM_ID }]);
      expect(updates).toEqual([
        expect.objectContaining({
          workspaceId: null,
          id: COMPENDIUM_ID,
          input: expect.objectContaining({ edition: '2nd ed.', place: 'Mockford' }),
        }),
      ]);
    });
  });

  // What only the whole form does with the field: send its rows through
  // the mutation and clear them for the next ingredient, and route a
  // server's issue on one source to its row.
  describe('on the whole form', () => {
    it('takes a picked source out, and gives back the text typed to find it, on one undo; a redo picks it again', async () => {
      renderForm();
      const calls = offerReferences([HERBAL]);

      await pick(calls, 'fixture', HERBAL.citation);
      expect(rows()).toHaveLength(1);
      expect(box()).toHaveValue('');

      undo();

      expect(rows()).toHaveLength(0);
      expect(box()).toHaveValue('fixture');

      redo();

      expect(rows()).toHaveLength(1);
      expect(box()).toHaveValue('');
      // Leaving a field validates it; let that land inside the test.
      await act(async () => {});
    });

    it('sends each source by its id with its locator as typed, and no citation text, clearing them after Save & Add Another', async () => {
      const saves = acceptCreate();
      const onSaved = renderForm();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      typeIn(locatorOf(HERBAL_SHORT), 'p. 112');
      typeIn(nameBox(), 'Testwort');
      press(saveButton('Save & Add Another'));

      await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), 'another'));
      expect(saves[0].input.references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: '' },
      ]);
      expect(JSON.stringify(saves[0].input)).not.toContain('Herbal');
      expect(LocalIngredientInput.parse(saves[0].input).references).toEqual([
        { referenceId: COMPENDIUM_ID, locator: 'p. 112' },
        { referenceId: COVEN_ID, locator: null },
      ]);
      await waitFor(() => expect(rows()).toHaveLength(0));
      noPanel();
    });

    it('puts a server error naming a source on its row, through the field’s one error element', async () => {
      mockGraphQLError('CreateWorkspaceIngredient', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['references', 1], message: 'No such source' }],
      });
      renderForm();
      const calls = offerReferences([HERBAL, NOTES]);

      await pickBoth(calls);
      typeIn(nameBox(), 'Testwort');
      save();

      // The error names the source it is about, and that row's × reads it.
      await waitFor(() => expect(box()).toBeInvalid());
      expect(box()).toHaveAccessibleDescription(expect.stringContaining(NOTES_SHORT));
      // Each × is described by its citation, the one in error by the error too.
      expect(
        within(references()).getByRole('button', { name: `Remove ${NOTES_SHORT}` }),
      ).toHaveAccessibleDescription(new RegExp(`^${escapeRegExp(NOTES.citation)} \\S`));
      expect(
        within(references()).getByRole('button', { name: `Remove ${HERBAL_SHORT}` }),
      ).toHaveAccessibleDescription(HERBAL.citation);
      expect(box()).toHaveFocus();
    });
  });
});
