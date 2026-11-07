import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';

// The add and edit dialogs as the stories reach them; names follow a task entry or component doc where one gives them.

/** The shell's Add Ingredient, in the bar (claude-docs/components/app-shell.md), found inside the banner so the empty list's own is never taken for it. A link is matched too, for `?new=ingredient-compendium`. */
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

/** The label and, where there is one, the formal name (claude-docs/components/modal.md, "An edit dialog's head"), so two entries sharing a label never share a name. */
function entryName(name: string, formalName?: string): string {
  return formalName ? `${name}, ${formalName}` : name;
}

/** The entry's page has its own icon (`openEditIngredientFromMenu`). A link or a button is matched. */
export function editIngredientControl(scope: Locator, name: string, formalName?: string): Locator {
  const label = `Edit ${entryName(name, formalName)}`;
  return scope
    .getByRole('link', { name: label, exact: true })
    .or(scope.getByRole('button', { name: label, exact: true }));
}

/** Named by its eyebrow and the entry's saved label and formal name (claude-docs/components/modal.md, "An edit dialog's head"). */
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

/** As `openEditIngredient`, from the entry's page, where Edit is an icon beside the three dots. */
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

/** A group drawn over the form, not an alertdialog, found by its two answers (claude-docs/components/modal.md, "Unsaved changes" and "Asking over the form"). */
export function discardQuestion(dialog: Locator) {
  return {
    discard: dialog.getByRole('button', { name: 'Discard Changes', exact: true }),
    keep: dialog.getByRole('button', { name: 'Keep Editing', exact: true }),
  };
}

/** An option's name starts with the category's and may carry its description (claude-docs/components/category-picker.md). */
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

export async function describedIds(field: Locator): Promise<string[]> {
  return ((await field.getAttribute('aria-describedby')) ?? '').split(/\s+/).filter(Boolean);
}

/** The error is found by the id the field names, not by its sentence, which is copy (claude-docs/components/ingredient-form.md, "One error element, two sources"). */
export async function expectFieldError(field: Locator, valid: readonly string[]): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const added = (await describedIds(field)).filter((id) => !valid.includes(id));
  expect(added).not.toHaveLength(0);
  for (const id of added) {
    await expect(field.page().locator(`id=${id}`)).toBeVisible();
  }
}

/** Editing lives where an ingredient is shown, never in the shell (claude-docs/design-decisions/mb.7-navigation.md, "DESIGN §9 Is Corrected, And Editing Lives Where An Ingredient Is Shown"). */
export function shellEditControls(page: Page): Locator {
  const shell = page.getByRole('banner').or(page.getByRole('navigation'));
  return shell
    .getByRole('button', { name: /^Edit\b/ })
    .or(shell.getByRole('link', { name: /^Edit\b/ }));
}

/** With one destination the chevron is not drawn (claude-docs/components/modal.md, "Add Ingredient"). */
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

/**
 * Holds the named GraphQL operations, as a user's slow connection would, until `release()`: the form autosaves
 * 3 s after its last change, and a held write keeps that save from landing between a step's edits and the click
 * on Save, which would leave Save disabled with nothing to save. Saves sent after `release()` pass at once.
 */
export async function holdSaves(page: Page, operationNames: string[]) {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  await page.route('**/api/graphql', async (route) => {
    const body = route.request().postDataJSON() as { operationName?: string } | null;
    if (!body?.operationName || !operationNames.includes(body.operationName)) {
      await route.fallback();
      return;
    }
    await opened;
    await route.continue();
  });
  return { release: open };
}
