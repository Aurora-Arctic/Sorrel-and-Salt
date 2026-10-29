import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

// The add and edit dialogs of a coven's ingredient as the stories reach them, here once beside
// coven-ingredients.ts so a changed name is corrected in one place. Names follow a task entry or component doc
// where one gives them, and are chosen here otherwise.

/**
 * The shell's Add Ingredient, in the bar (claude-docs/components/app-shell.md; design-decisions/mb.7-navigation.md),
 * found inside the banner so the empty list's own Add Ingredient is never taken for it. A link is matched too,
 * for the compendium's `?new=ingredient-compendium`, so "none" means neither.
 */
export function shellAddIngredient(page: Page): Locator {
  const banner = page.getByRole('banner');
  return banner
    .getByRole('button', { name: 'Add Ingredient', exact: true })
    .or(banner.getByRole('link', { name: 'Add Ingredient', exact: true }));
}

/** The shell's Add Ingredient, which on a coven's page adds to that coven (claude-docs/components/app-shell.md). */
export async function openAddIngredient(page: Page) {
  await shellAddIngredient(page).click();
  const dialog = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * The name of an entry's Edit, and of what follows the dialog's eyebrow: the label and, where there is one, the
 * formal name (claude-docs/components/compendium-list.md; claude-docs/components/modal.md, "An edit dialog's
 * head"), so two entries sharing a label never share a name.
 */
function entryName(name: string, formalName?: string): string {
  return formalName ? `${name}, ${formalName}` : name;
}

/**
 * An entry's Edit in `scope`, a row of the coven's list ("Edit Testwort, Fixtura testalis"); the entry's page
 * has its own icon (`openEditIngredientFromMenu`). A link or a button is matched.
 */
export function editIngredientControl(scope: Locator, name: string, formalName?: string): Locator {
  const label = `Edit ${entryName(name, formalName)}`;
  return scope
    .getByRole('link', { name: label, exact: true })
    .or(scope.getByRole('button', { name: label, exact: true }));
}

/**
 * The edit dialog, named by its eyebrow and the entry's saved label and formal name, "Edit Ingredient,
 * Testwort, Fixtura testalis" (claude-docs/components/modal.md, "An edit dialog's head").
 */
export function editIngredientDialog(page: Page, name: string, formalName?: string): Locator {
  return page.getByRole('dialog', {
    name: `Edit Ingredient, ${entryName(name, formalName)}`,
    exact: true,
  });
}

/** Opens the entry's Edit in `scope` and its sections: an edit opens with every section shut, and Open All opens them so every pre-filled field can be read. */
export async function openEditIngredient(
  page: Page,
  scope: Locator,
  name: string,
  formalName?: string,
): Promise<Locator> {
  await editIngredientControl(scope, name, formalName).click();
  const dialog = editIngredientDialog(page, name, formalName);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Open All' }).click();
  return dialog;
}

/** Opens the edit from the entry's page, where Edit is an icon beside the bin, and its sections, as `openEditIngredient` does from a row. */
export async function openEditIngredientFromMenu(
  page: Page,
  name: string,
  formalName?: string,
): Promise<Locator> {
  await page
    .getByRole('main')
    .getByRole('link', { name: `Edit ${name}`, exact: true })
    .click();
  const dialog = editIngredientDialog(page, name, formalName);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Open All' }).click();
  return dialog;
}

/**
 * The question a dialog asks before its changes are thrown away: a group drawn over the form, not an
 * alertdialog, found by its two answers, Discard Changes and Keep Editing (claude-docs/components/modal.md,
 * "Unsaved changes" and "Asking over the form").
 */
export function discardQuestion(dialog: Locator) {
  return {
    discard: dialog.getByRole('button', { name: 'Discard Changes', exact: true }),
    keep: dialog.getByRole('button', { name: 'Keep Editing', exact: true }),
  };
}

/**
 * Picks a category in the dialog's CategoryPicker, the box named "Category" (claude-docs/components/category-picker.md).
 * An option's name starts with the category's and may carry its description.
 */
export async function pickCategoryIn(dialog: Locator, name: string): Promise<void> {
  const box = dialog.getByRole('combobox', { name: 'Category', exact: true });
  await box.fill(name);
  await dialog
    .page()
    .getByRole('option', { name: new RegExp(`^${name}`) })
    .click();
}

/** A pick in the dialog's Categories field, by the × that takes it out: a chip inside the control with its × named "Remove Protection" (`ComboboxEntry`, src/components/Combobox/entry.tsx). */
export function categoryChip(dialog: Locator, name: string): Locator {
  return dialog
    .getByRole('group', { name: 'Categories', exact: true })
    .getByRole('button', { name: `Remove ${name}`, exact: true });
}

/** The ids `field`'s `aria-describedby` lists: its hint, its note and, while it has one, its error. */
export async function describedIds(field: Locator): Promise<string[]> {
  return ((await field.getAttribute('aria-describedby')) ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Checks `field` is marked invalid and that its description gained an element on show, its error, beside the ids
 * it listed while valid (`valid`): the link `FieldError` makes (claude-docs/components/ingredient-form.md, "One
 * error element, two sources"). The error is found by the id the field names, not by its sentence, which is copy.
 */
export async function expectFieldError(field: Locator, valid: readonly string[]): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const added = (await describedIds(field)).filter((id) => !valid.includes(id));
  expect(added).not.toHaveLength(0);
  for (const id of added) {
    await expect(field.page().locator(`id=${id}`)).toBeVisible();
  }
}

/**
 * Every Edit the shell offers: in its bar, the banner, and each `nav` landmark (claude-docs/design-decisions/mb.7-navigation.md,
 * "Landmarks"). Editing lives where an ingredient is shown, never here.
 */
export function shellEditControls(page: Page): Locator {
  const shell = page.getByRole('banner').or(page.getByRole('navigation'));
  return shell
    .getByRole('button', { name: /^Edit\b/ })
    .or(shell.getByRole('link', { name: /^Edit\b/ }));
}

/**
 * The menu of places Add Ingredient can go, for someone with more than one (claude-docs/components/modal.md,
 * "Add Ingredient"): the chevron named "Choose Where to Add" opens a `menu` of destinations, the compendium
 * first. With one destination the chevron is not drawn.
 */
export function destinationMenu(page: Page) {
  const banner = page.getByRole('banner');
  const menu = banner.getByRole('menu');
  return {
    toggle: banner.getByRole('button', { name: 'Choose Where to Add', exact: true }),
    menu,
    choices: menu.getByRole('menuitem'),
    choice: (name: string) => menu.getByRole('menuitem', { name, exact: true }),
  };
}
