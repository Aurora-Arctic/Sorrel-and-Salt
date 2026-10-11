import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor as waitForDom } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import type {
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import {
  offerDeities,
  offerDuplicates,
  offerForms,
  offerNames,
  offerPlanets,
  offerReferences,
  offerSigns,
} from '../../support/msw/ingredient-lookups';

// The form's seven sections as disclosures (MB.115, the owner's calls): a
// new entry opens with every one open, an edit with every one closed to its
// summary line; each heading opens and closes its own; Open All / Close All
// every one; and a save that finds an error in a closed section opens it so
// the focus reaches the field (claude-docs/components/ingredient-form.md,
// "Sections").

const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';
const SECTIONS = [
  'Identity',
  'Description',
  'Correspondences',
  'Relations',
  'Safety',
  'Sources',
  'Variants',
];

/** An entry with something in its Identity, as the summary line reads it back. */
const TESTWORT: IngredientFormValues = {
  ...EMPTY_VALUES,
  name: 'Testwort',
  nomenclature: 'botanical',
  canonicalName: 'Fixtura testalis',
};

function renderForm(values?: IngredientFormValues) {
  for (const offer of [offerForms, offerNames, offerPlanets, offerSigns, offerDeities]) offer([]);
  offerReferences([]);
  offerDuplicates([]);
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: [] },
  }));
  mockGraphQLQuery<Record<string, unknown>>('CompendiumSubstitutes', () => ({
    compendium: { edges: [] },
  }));
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientForm workspaceId={null} entry={values && { id: ENTRY_ID, values }} />
    </QueryClientProvider>,
  );
}

const waitFor: typeof waitForDom = (callback, options) =>
  waitForDom(callback, { interval: 5, ...options });

/** A section's heading button, by the section's title. */
const toggle = (title: string) => screen.getByRole('button', { name: title });
const expanded = (title: string) => toggle(title).getAttribute('aria-expanded') === 'true';
/** Which sections are open, by title, in page order. */
const openSections = () => SECTIONS.filter(expanded);

// Fields found by label, which reaches a field in a closed section too, so
// a test can say whether it is in view.
const byLabel = (name: string) =>
  screen.getByLabelText(name, {
    selector: 'input:not([role]), textarea, [role="combobox"]',
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });

function acceptUpdate() {
  const calls: UpdateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    UpdateCompendiumIngredientMutation,
    UpdateCompendiumIngredientMutationVariables
  >('UpdateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return {
      updateCompendiumIngredient: { id: ENTRY_ID, name: variables.input.name, slug: 'testwort' },
    };
  });
  return calls;
}

/** Changes the entry's description, so Save has something to send. */
function changeDescription() {
  fireEvent.click(toggle('Description'));
  fireEvent.change(byLabel('Description'), { target: { value: 'A fixture herb.' } });
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Ingredient' }));

describe('IngredientForm’s sections', () => {
  it('opens a new entry with every section open, its fields in view', () => {
    renderForm();

    expect(openSections()).toEqual(SECTIONS);
    expect(byLabel('Name')).toBeVisible();
    expect(byLabel('Safety Notes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close All' })).toBeInTheDocument();
  });

  it('opens an edit with every section closed to its summary, its fields out of view', () => {
    renderForm(TESTWORT);

    expect(openSections()).toEqual([]);
    expect(byLabel('Name')).not.toBeVisible();
    expect(byLabel('Safety Notes')).not.toBeVisible();
    // Each closed heading is described by its summary line, the entry's own values in Identity's.
    for (const title of SECTIONS) expect(toggle(title)).toHaveAccessibleDescription();
    expect(toggle('Identity')).toHaveAccessibleDescription(
      expect.stringMatching(/Testwort.*Fixtura testalis/),
    );
  });

  it('opens and closes one section by its heading, leaving the others as they were', () => {
    renderForm(TESTWORT);

    fireEvent.click(toggle('Correspondences'));
    expect(openSections()).toEqual(['Correspondences']);
    expect(byLabel('Planet')).toBeVisible();
    expect(byLabel('Name')).not.toBeVisible();

    fireEvent.click(toggle('Safety'));
    expect(openSections()).toEqual(['Correspondences', 'Safety']);

    fireEvent.click(toggle('Correspondences'));
    expect(openSections()).toEqual(['Safety']);
    expect(byLabel('Planet')).not.toBeVisible();
  });

  it('opens every section with Open All, and closes every one with Close All while any is open', () => {
    renderForm(TESTWORT);

    fireEvent.click(screen.getByRole('button', { name: 'Open All' }));
    expect(openSections()).toEqual(SECTIONS);

    fireEvent.click(toggle('Relations'));
    fireEvent.click(screen.getByRole('button', { name: 'Close All' }));
    expect(openSections()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Open All' })).toBeInTheDocument();
  });

  it('keeps what was typed in a section through closing and opening it, the summary reading it', () => {
    renderForm();
    const name = byLabel('Name');
    fireEvent.change(name, { target: { value: 'Mockwort' } });

    fireEvent.click(toggle('Identity'));
    expect(toggle('Identity')).toHaveAccessibleDescription(expect.stringContaining('Mockwort'));
    fireEvent.click(toggle('Identity'));

    // The same box, never unmounted, still holding the text.
    expect(byLabel('Name')).toBe(name);
    expect(name).toHaveValue('Mockwort');
  });

  it('opens a closed section a save finds the schema’s error in, its field focused, and sends nothing', async () => {
    const calls = acceptUpdate();
    // A colour typed into its box and never added, which a save refuses.
    renderForm({ ...TESTWORT, drafts: { ...TESTWORT.drafts, colors: 'Fixture Red' } });
    changeDescription();
    expect(expanded('Correspondences')).toBe(false);

    save();

    await waitFor(() => expect(expanded('Correspondences')).toBe(true));
    const colour = byLabel('Colour');
    expect(colour).toBeInvalid();
    expect(colour).toHaveFocus();
    expect(openSections()).toEqual(['Description', 'Correspondences']);
    expect(calls).toHaveLength(0);
  });

  it('opens a closed section the server refuses a field in, its field focused', async () => {
    mockGraphQLError('UpdateCompendiumIngredient', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['safetyNotes'], message: 'Fixture refusal' }],
    });
    renderForm(TESTWORT);
    changeDescription();
    expect(expanded('Safety')).toBe(false);

    save();

    await waitFor(() => expect(expanded('Safety')).toBe(true));
    const notes = byLabel('Safety Notes');
    expect(notes).toBeInvalid();
    expect(notes).toHaveFocus();
  });
});
