import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '../../support/ingredient-form';
import { press } from '../../support/interact';
import {
  COPIED,
  OILWORT_ID,
  OILWORT_OIL_ID,
  control,
  copyOf,
  filled,
  openWhole,
  renderVariants,
  sent,
  skippedNotice,
  twoForms,
} from './variants-harness';

// A variant's Copy From Ingredient buttons (MB.115, the owner's call): each
// of an open variant's fields but its form fills from the ingredient's own,
// adding and never taking away. Rendered by ./variants-harness.tsx, the
// ingredient's own fields held in the form's values and its Description a
// box beside the field; a copy into the list fields, sent by the whole
// form's save, is variants.test.tsx's
// (claude-docs/components/ingredient-form.md, "The variants").

const save = () => press('Save Ingredient');

describe('copying from the ingredient', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives each copied field its own button, named for the field', () => {
    renderVariants({ workspaceId: null, values: filled() });

    const oil = openWhole('Oil');

    const buttons = within(oil).getAllByRole('button', { name: /^Copy From Ingredient: / });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      COPIED.map((field) => `Copy From Ingredient: ${field}`),
    );
  });

  it('shuts each button while the ingredient’s field is empty, and opens it as the field gains a value', () => {
    renderVariants({ workspaceId: null, values: twoForms() });
    const oil = openWhole('Oil');

    for (const field of COPIED) expect(copyOf(oil, field)).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Ingredient Description' }), {
      target: { value: 'A fixture herb.' },
    });

    expect(copyOf(oil, 'Description')).toBeEnabled();
    expect(copyOf(oil, 'Safety Notes')).toBeDisabled();
  });

  it('fills an empty text box with the ingredient’s text, and adds it after a blank line to a filled one', () => {
    renderVariants({ workspaceId: null, values: filled() });
    const oil = openWhole('Oil');

    fireEvent.click(copyOf(oil, 'Description'));
    act(() => copyOf(oil, 'Safety Notes').focus());
    fireEvent.click(copyOf(oil, 'Safety Notes'));

    expect(control(oil, 'Description')).toHaveValue('A fixture herb.');
    expect(control(oil, 'Safety Notes')).toHaveValue('Dilute before use.\n\nKeep from children.');
    expect(copyOf(oil, 'Safety Notes')).toHaveFocus();
  });

  // MB.115, the owner's calls: Oil for Oil, and an ingredient in no such
  // form skipped, since a variant's link names a form.
  it('links each substitute’s same form, skips one in no such form and says which, and keeps a name as a name', async () => {
    const onSubmit = renderVariants({ workspaceId: null, values: filled() });
    const oil = openWhole('Oil');
    expect(skippedNotice(oil)).toBeEmptyDOMElement();

    fireEvent.click(copyOf(oil, 'Substitute Ingredients'));

    // Tinctwort comes in no oil, and Plainwort in no form at all.
    const notice = skippedNotice(oil);
    expect(notice).toHaveTextContent(/Tinctwort/);
    expect(notice).toHaveTextContent(/Plainwort/);
    expect(notice).not.toHaveTextContent(/Oilwort|Fixture moss/);
    // Announced once, by the region (M12.48).
    expect(within(notice).queryAllByRole('alert')).toEqual([]);
    expect(within(notice).queryAllByRole('status')).toEqual([]);
    expect(
      within(oil).getByRole('status', { name: 'Substitute Ingredients changes' }),
    ).toHaveTextContent(/2/);
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sent(onSubmit)?.variants?.[0]?.substitutes).toEqual([
      { name: 'Fixture fern' },
      { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
      { name: 'Fixture moss' },
    ]);
  });

  it('adds what a copy skipped as names only at Copy Anyway, the focus back on the copy', async () => {
    const onSubmit = renderVariants({ workspaceId: null, values: filled() });
    const oil = openWhole('Oil');
    const copy = copyOf(oil, 'Substitute Ingredients');
    fireEvent.click(copy);

    fireEvent.click(within(skippedNotice(oil)).getByRole('button', { name: 'Copy Anyway' }));

    expect(copy).toHaveFocus();
    expect(skippedNotice(oil)).toBeEmptyDOMElement();
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sent(onSubmit)?.variants?.[0]?.substitutes).toEqual([
      { name: 'Fixture fern' },
      { ingredientId: OILWORT_ID, substituteVariantId: OILWORT_OIL_ID },
      { name: 'Fixture moss' },
      { name: 'Tinctwort' },
      { name: 'Plainwort' },
    ]);
  });

  it('takes the notice away at its dismiss, and once the list changes otherwise', () => {
    renderVariants({ workspaceId: null, values: filled() });
    const oil = openWhole('Oil');
    const copy = copyOf(oil, 'Substitute Ingredients');

    fireEvent.click(copy);
    fireEvent.click(within(skippedNotice(oil)).getByRole('button', { name: 'Dismiss' }));
    expect(skippedNotice(oil)).toBeEmptyDOMElement();
    expect(copy).toHaveFocus();

    fireEvent.click(copy);
    expect(skippedNotice(oil)).not.toBeEmptyDOMElement();
    fireEvent.click(within(oil).getByRole('button', { name: 'Remove Fixture fern' }));
    expect(skippedNotice(oil)).toBeEmptyDOMElement();
  });
});
