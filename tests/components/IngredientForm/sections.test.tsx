import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientForm from '@/components/IngredientForm';
import type { IngredientFormValues } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { renderInModal } from '../../support/discard-guard';
import { control, renderWithClient, waitFor, duplicateHref } from '../../support/ingredient-form';
import { choose, press, type, typeIn } from '../../support/interact';
import { mockGraphQLError } from '../../support/msw/graphql';
import { ENTRY_ID, acceptUpdate, offerNothing } from '../../support/msw/ingredient-lookups';

// The form's six sections as disclosures (MB.115, the owner's calls): a
// new entry opens with every one open, an edit with every one closed to its
// summary line; each heading opens and closes its own; Open All / Close All
// every one; and a save that finds an error in a closed section opens it so
// the focus reaches the field (claude-docs/components/ingredient-form.md,
// "Sections").

const SECTIONS = [
  'Identity',
  'Details & Care',
  'Correspondences',
  'Relations',
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
  offerNothing();
  renderWithClient(
    <IngredientForm
      duplicateHref={duplicateHref}
      workspaceId={null}
      entry={values && { id: ENTRY_ID, values }}
    />,
  );
}

/** A section's heading button, by the section's title. */
const toggle = (title: string) => screen.getByRole('button', { name: title });
const expanded = (title: string) => toggle(title).getAttribute('aria-expanded') === 'true';
/** Which sections are open, by title, in page order. */
const openSections = () => SECTIONS.filter(expanded);

// Fields are found by label (`control`), which reaches a field in a closed
// section too, so a test can say whether it is in view.

/** Changes the entry's description, so Save has something to send, and closes its section again. */
function changeDescription() {
  fireEvent.click(toggle('Details & Care'));
  type('Description', 'A fixture herb.');
  fireEvent.click(toggle('Details & Care'));
}

const save = () => press('Save Ingredient');

describe('IngredientForm’s sections', () => {
  it('opens a new entry with every section open, its fields in view', () => {
    renderForm();

    expect(openSections()).toEqual(SECTIONS);
    expect(control('Name')).toBeVisible();
    expect(control('Safety Notes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close All' })).toBeInTheDocument();
  });

  it('opens an edit with every section closed to its summary, its fields out of view', () => {
    renderForm(TESTWORT);

    expect(openSections()).toEqual([]);
    expect(control('Name')).not.toBeVisible();
    expect(control('Safety Notes')).not.toBeVisible();
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
    expect(control('Celestial Body')).toBeVisible();
    expect(control('Name')).not.toBeVisible();

    fireEvent.click(toggle('Details & Care'));
    expect(openSections()).toEqual(['Details & Care', 'Correspondences']);

    fireEvent.click(toggle('Correspondences'));
    expect(openSections()).toEqual(['Details & Care']);
    expect(control('Celestial Body')).not.toBeVisible();
  });

  it('puts Open All out of the form in a modal, and it still opens every section', () => {
    offerNothing();
    renderInModal(() => (
      <IngredientForm
        duplicateHref={duplicateHref}
        workspaceId={null}
        entry={{ id: ENTRY_ID, values: TESTWORT }}
      />
    ));

    const openAll = screen.getByRole('button', { name: 'Open All' });
    // In the modal's header rather than in the form.
    expect(openAll.closest('form')).toBeNull();

    fireEvent.click(openAll);

    expect(openSections()).toEqual(SECTIONS);
  });

  // The owner's call: a control the question holds is off, not merely faded.
  it('turns Close All off while the unsaved changes are asked about, and on again on Keep Editing', async () => {
    offerNothing();
    renderInModal((done) => (
      <IngredientForm duplicateHref={duplicateHref} workspaceId={null} onCancel={done} />
    ));
    const closeAll = screen.getByRole('button', { name: 'Close All' });
    type('Name', 'Testwort');
    expect(closeAll).toBeEnabled();

    press('Cancel');
    // Leaving Name validates it, which lands after the press.
    await act(async () => {});

    expect(screen.getByRole('button', { name: 'Keep Editing' })).toBeInTheDocument();
    expect(closeAll).toBeDisabled();

    press('Keep Editing');

    expect(screen.queryByRole('button', { name: 'Keep Editing' })).not.toBeInTheDocument();
    expect(closeAll).toBeEnabled();
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
    const name = control('Name');
    typeIn(name, 'Mockwort');

    fireEvent.click(toggle('Identity'));
    expect(toggle('Identity')).toHaveAccessibleDescription(expect.stringContaining('Mockwort'));
    fireEvent.click(toggle('Identity'));

    // The same box, never unmounted, still holding the text.
    expect(control('Name')).toBe(name);
    expect(name).toHaveValue('Mockwort');
  });

  // The flag follows the fields' own rule: a classification pick raises the
  // formal-name rule, which Formal Name does not draw until it is left.
  it('flags a section only once a field in it shows its error', async () => {
    renderForm();

    type('Name', 'Testwort');
    choose('Classification', 'Botanical');
    fireEvent.blur(control('Classification'));
    await waitFor(() => expect(control('Classification')).toHaveTextContent('Botanical'));
    expect(toggle('Identity')).not.toHaveAttribute('aria-describedby');

    fireEvent.focus(control('Formal Name'));
    type('Formal Name', 'x');
    type('Formal Name', '');
    fireEvent.blur(control('Formal Name'));

    await waitFor(() => expect(control('Formal Name')).toBeInvalid());
    expect(toggle('Identity')).toHaveAttribute('aria-describedby');
  });

  it('opens a closed section a save finds the schema’s error in, its field focused, and sends nothing', async () => {
    const calls = acceptUpdate();
    // A colour typed into its box and never added, which a save refuses.
    renderForm({ ...TESTWORT, drafts: { ...TESTWORT.drafts, colors: 'Fixture Red' } });
    changeDescription();
    expect(expanded('Correspondences')).toBe(false);

    save();

    await waitFor(() => expect(expanded('Correspondences')).toBe(true));
    const colour = control('Colour');
    expect(colour).toBeInvalid();
    expect(colour).toHaveFocus();
    expect(openSections()).toEqual(['Correspondences']);
    expect(calls).toHaveLength(0);
  });

  it('opens a closed section the server refuses a field in, its field focused', async () => {
    mockGraphQLError('UpdateCompendiumIngredient', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['safetyNotes'], message: 'Fixture refusal' }],
    });
    renderForm(TESTWORT);
    changeDescription();
    expect(expanded('Details & Care')).toBe(false);

    save();

    await waitFor(() => expect(expanded('Details & Care')).toBe(true));
    const notes = control('Safety Notes');
    expect(notes).toBeInvalid();
    expect(notes).toHaveFocus();
  });
});
