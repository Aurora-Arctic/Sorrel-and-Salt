import { fireEvent, screen, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { ReferencesField } from '@/components/IngredientForm/references';
import type { IngredientFormInput, IngredientFormValues } from '@/components/IngredientForm/types';
import {
  EMPTY_VALUES,
  EMPTY_VARIANT,
  compendiumResolver,
  ingredientResolver,
} from '@/components/IngredientForm/values';
import { chooseKind, inPanel, referencePanel, waitFor } from '../../support/ingredient-form';
import { renderWithQuery } from '../../support/render-with-query';
import { press, typeIn } from '../../support/interact';
import {
  WORKSPACE_ID,
  acceptReference,
  acceptReferenceUpdate,
  offerNothing,
  offerReference,
} from '../../support/msw/ingredient-lookups';
import type { ReferenceNode } from './types';

// claude-docs/components/ingredient-form.md, "The references"

const SOURCE_ID = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

// Invented: a real title is only safe until someone seeds it.
const HERBAL: ReferenceNode = {
  id: SOURCE_ID,
  citation: 'Fixture, Ada. The Testwort Herbal. Mockford: Fixture Press, 1901.',
  isGlobal: true,
  kind: 'book',
  authors: 'Fixture, Ada',
  title: 'The Testwort Herbal',
  container: null,
};
const HERBAL_SHORT = 'Fixture, Testwort Herbal';
const OIL = {
  id: '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a',
  name: 'Oil',
  group: 'Preparation',
  icon: null,
  description: null,
};

const herbalWhole = (scholarly: boolean) =>
  ({
    id: SOURCE_ID,
    kind: 'book',
    title: 'The Testwort Herbal',
    authors: 'Fixture, Ada',
    container: null,
    contributors: null,
    edition: null,
    volume: null,
    issue: null,
    series: null,
    place: 'Mockford',
    publisher: 'Fixture Press',
    published: '1901',
    pages: null,
    host: null,
    url: null,
    modified: null,
    accessed: null,
    note: null,
    scholarly,
  }) as const;

function renderListed(workspaceId: string | null, sources: ReferenceNode[] = [HERBAL]) {
  const onSubmit = vi.fn();
  const entryOf = ({ citation, ...link }: ReferenceNode) => ({
    value: citation,
    link: { ...link, isGlobal: workspaceId === null || link.isGlobal },
    locator: '',
    nameBasis: '' as const,
    supports: [],
  });
  const Harness = () => {
    const methods = useForm<IngredientFormValues, unknown, IngredientFormInput>({
      defaultValues: {
        ...EMPTY_VALUES,
        name: 'Testwort',
        nomenclature: 'unknown',
        references: sources.map(entryOf),
        variants: [
          { ...EMPTY_VARIANT, form: 'Oil', formLink: OIL, references: sources.map(entryOf) },
        ],
      },
      resolver: workspaceId === null ? compendiumResolver : ingredientResolver,
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
  renderWithQuery(<Harness />);
  return onSubmit;
}

const [ingredient, variant] = [0, 1].map(
  (at) => () => screen.getAllByRole('group', { name: 'References' })[at],
);
function openRow(list: HTMLElement): HTMLElement {
  const pencil = within(list).getByRole('button', { name: `Edit ${HERBAL_SHORT}` });
  if (pencil.getAttribute('aria-expanded') !== 'true') press(pencil);
  return within(list).getByRole('listitem');
}
const nameBasisIn = (row: HTMLElement) =>
  within(row).queryByRole('combobox', { name: 'Name Basis' });
const supportsIn = (row: HTMLElement) => within(row).queryByRole('combobox', { name: 'Supports' });
/** Each row's box has a list of the same name, so this is the one the box says it controls. */
function listOf(control: HTMLElement, list: string): HTMLElement {
  const lists = screen.getAllByRole('listbox', { name: `${list} choices` });
  const owned = control.getAttribute('aria-controls');
  return lists.find((element) => owned !== null && element.closest(`#${owned}`)) ?? lists[0];
}
function offered(control: HTMLElement, list: string): string[] {
  fireEvent.click(control);
  const labels = within(listOf(control, list))
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
  fireEvent.keyDown(control, { key: 'Escape' });
  return labels;
}
function chooseIn(control: HTMLElement, list: string, ...labels: string[]) {
  fireEvent.click(control);
  const listbox = listOf(control, list);
  for (const label of labels) fireEvent.click(within(listbox).getByRole('option', { name: label }));
  if (control.getAttribute('aria-expanded') === 'true')
    fireEvent.keyDown(control, { key: 'Escape' });
}
const saveIngredient = () => press(screen.getByRole('button', { name: 'Save Ingredient' }));

describe('a citation’s compendium attributes', () => {
  describe('on the compendium’s form', () => {
    it('sends the name basis and the fields supported, beside the locator, for the entry and its form', async () => {
      offerNothing();
      const onSubmit = renderListed(null);

      const entryRow = openRow(ingredient());
      chooseIn(nameBasisIn(entryRow) as HTMLElement, 'Name Basis', 'Resolved');
      chooseIn(supportsIn(entryRow) as HTMLElement, 'Supports', 'Description', 'Deities');
      const formRow = openRow(variant());
      chooseIn(nameBasisIn(formRow) as HTMLElement, 'Name Basis', 'Stated');
      chooseIn(supportsIn(formRow) as HTMLElement, 'Supports', 'Form');
      saveIngredient();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      const sent = onSubmit.mock.calls[0][0] as IngredientFormInput;
      expect(sent.references).toEqual([
        {
          referenceId: SOURCE_ID,
          locator: '',
          nameBasis: 'resolved',
          supports: ['description', 'deities'],
        },
      ]);
      expect(sent.variants[0].references).toEqual([
        { referenceId: SOURCE_ID, locator: '', nameBasis: 'stated', supports: ['form'] },
      ]);
    });

    it('offers a form’s citation only what a form holds, and an entry’s only what an entry holds', () => {
      offerNothing();
      renderListed(null);

      const entrySupports = offered(supportsIn(openRow(ingredient())) as HTMLElement, 'Supports');
      const formSupports = offered(supportsIn(openRow(variant())) as HTMLElement, 'Supports');

      expect(entrySupports).toEqual(expect.arrayContaining(['Formal Name', 'Deities']));
      expect(entrySupports).not.toContain('Form');
      expect(formSupports).toContain('Form');
      expect(formSupports).not.toEqual(expect.arrayContaining(['Deities']));
      expect(formSupports).not.toContain('Folk Names');
    });

    it('sends neither attribute while none is chosen', async () => {
      offerNothing();
      const onSubmit = renderListed(null);

      const row = openRow(ingredient());
      expect(nameBasisIn(row)).toBeInTheDocument();
      saveIngredient();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect((onSubmit.mock.calls[0][0] as IngredientFormInput).references).toEqual([
        { referenceId: SOURCE_ID, locator: '' },
      ]);
    });
  });

  describe('on a coven’s form', () => {
    it('has no name basis and no supports on a row, and sends neither', async () => {
      offerNothing();
      const onSubmit = renderListed(WORKSPACE_ID);

      const row = openRow(ingredient());
      expect(within(row).getByRole('textbox', { name: 'Locator' })).toBeInTheDocument();
      expect(nameBasisIn(row)).toBeNull();
      expect(supportsIn(row)).toBeNull();
      expect(supportsIn(openRow(variant()))).toBeNull();
      saveIngredient();

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect((onSubmit.mock.calls[0][0] as IngredientFormInput).references).toEqual([
        { referenceId: SOURCE_ID, locator: '' },
      ]);
    });
  });
});

describe('a source’s Scholarly mark', () => {
  function newReference() {
    const box = within(ingredient()).getByRole('combobox', { name: 'Reference' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: 'New Reference' }));
  }
  const scholarly = (scope: HTMLElement) =>
    within(scope).queryByRole('switch', { name: 'Scholarly' });

  it('is offered on a new compendium source and sent as chosen', async () => {
    offerNothing();
    const creates = acceptReference();
    renderListed(null, []);

    newReference();
    const panel = referencePanel(ingredient());
    chooseKind('Book', ingredient());
    typeIn(inPanel('Title', ingredient()), 'A Fixture Pharmacopoeia');
    typeIn(inPanel('Published', ingredient()), '1999');
    fireEvent.click(scholarly(panel) as HTMLElement);
    press(within(panel).getByRole('button', { name: 'Save Reference' }));

    await waitFor(() => expect(creates).toHaveLength(1));
    expect(creates[0]).toMatchObject({ workspaceId: null, input: { scholarly: true } });
  });

  it('is absent from a coven’s new source, which is sent unmarked', async () => {
    offerNothing();
    const creates = acceptReference();
    renderListed(WORKSPACE_ID, []);

    newReference();
    const panel = referencePanel(ingredient());
    expect(within(panel).getByRole('combobox', { name: 'Kind' })).toBeInTheDocument();
    expect(scholarly(panel)).toBeNull();
    chooseKind('Book', ingredient());
    typeIn(inPanel('Title', ingredient()), 'A Fixture Pharmacopoeia');
    typeIn(inPanel('Published', ingredient()), '1999');
    press(within(panel).getByRole('button', { name: 'Save Reference' }));

    await waitFor(() => expect(creates).toHaveLength(1));
    expect(creates[0].input.scholarly).not.toBe(true);
  });

  it('opens an edited source as it is marked, Save held until the mark changes', async () => {
    offerNothing();
    offerReference(herbalWhole(true));
    const updates = acceptReferenceUpdate(HERBAL.citation);
    renderListed(null);

    openRow(ingredient());
    press(within(ingredient()).getByRole('button', { name: `Edit Source ${HERBAL_SHORT}` }));
    const panel = () => within(ingredient()).getByRole('group', { name: 'Edit Source' });
    await waitFor(() => expect(scholarly(panel())).toBeChecked());
    const saveSource = within(panel()).getByRole('button', { name: 'Save Source' });
    expect(saveSource).toBeDisabled();

    fireEvent.click(scholarly(panel()) as HTMLElement);
    expect(saveSource).toBeEnabled();
    press(saveSource);

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({ workspaceId: null, input: { scholarly: false } });
  });
});
