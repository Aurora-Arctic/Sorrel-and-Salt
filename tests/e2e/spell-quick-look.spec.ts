import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, localIngredient, seedCoven, withSql } from './stories/coven-ingredients';

// Quick Look a spell from the grimoire list (M13.21). What no story walks: the eye opens the
// spell in a modal at the tab's own address plus ?spell=<id>, Escape and Close return to the
// list with focus on the eye, Edit swaps ?spell for ?edit, a viewer has no Edit, another
// member's private spell and another coven's spell open nothing, an ingredient step's eye opens
// the ingredient's details over the modal at &entry=<id> (the owner, 2026-10-28), and the modal
// passes axe and stays usable at 375px.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the eye opens a spell in a modal over the list, and the modal is closed, edited and refused as set out', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Look', 'spell-look.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  const [shared, secret, held] = await withSql(async (sql) => {
    const shared = await insertSpell(
      sql,
      coven.id,
      'Fixture Working',
      'workspace',
      coven.users.B,
      'complete',
    );
    // One ingredient step, laying the coven's own Testwort, for the eye the modal's step draws.
    const testwort = await localIngredient(sql, coven.id, coven.users.A);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${coven.users.B}, true)`;
      await tx`insert into spell_steps (spell_id, ingredient_id, variant_id, position, layer_order, quantity, unit, created_by, updated_by)
        values (${shared}, ${testwort.ingredientId}, ${testwort.variantId}, 1, 1, 2, 'tsp', ${coven.users.B}, ${coven.users.B})`;
    });
    return [
      shared,
      await insertSpell(sql, coven.id, 'Fixture Secret', 'private', coven.users.A, 'complete'),
      testwort.ingredientId,
    ];
  });
  const other = await seedCoven(page, 'Fixture Coven Look X', 'spell-look-x.test', { D: 'owner' });
  const grimoire = `/coven/${coven.slug}/grimoire`;

  // A member opens Quick Look from the eye; the filter stays in the address.
  await signInAgainAs(page, coven.users.B);
  await page.goto(`${grimoire}?query=fixture`);
  const eye = page.getByRole('link', { name: 'Quick Look Fixture Working' });
  await eye.click();
  await expect(page).toHaveURL(`${grimoire}?query=fixture&spell=${shared}`);
  const look = page.getByRole('dialog', { name: 'Fixture Working' });
  await expect(look).toBeVisible();
  await expect(look.getByRole('link', { name: 'See Recipe Page' })).toHaveAttribute(
    'href',
    `${grimoire}/${shared}`,
  );
  await assertNoAccessibilityViolations(page);

  // The step's eye opens the ingredient's details over the modal, at the same address plus
  // &entry=<id>; Escape closes the details and the spell's modal is still there.
  await look.getByRole('link', { name: 'Quick Look Testwort' }).click();
  await expect(page).toHaveURL(`${grimoire}?query=fixture&spell=${shared}&entry=${held}`);
  const details = page.getByRole('dialog', { name: 'Testwort' });
  await expect(details).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(`${grimoire}?query=fixture&spell=${shared}`);
  await expect(details).toHaveCount(0);
  await expect(look).toBeVisible();

  // Escape returns to the list as it was, with focus back on the eye.
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(`${grimoire}?query=fixture`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(eye).toBeFocused();

  // Edit replaces ?spell with ?edit, so one dialog shows, and closing it returns to the list.
  await eye.click();
  await page
    .getByRole('dialog', { name: 'Fixture Working' })
    .getByRole('link', { name: 'Edit Spell', exact: true })
    .click();
  await expect(page).toHaveURL(`${grimoire}?query=fixture&edit=${shared}`);
  await expect(page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(`${grimoire}?query=fixture`);

  // Phone width: the modal is still reachable and closes with its button.
  await page.setViewportSize({ width: 375, height: 800 });
  await eye.click();
  const phone = page.getByRole('dialog', { name: 'Fixture Working' });
  await expect(phone.getByRole('link', { name: 'See Recipe Page' })).toBeVisible();
  await phone.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  // A viewer opens the same modal and is offered no Edit.
  await signInAgainAs(page, coven.users.C);
  await page.goto(`${grimoire}?spell=${shared}`);
  await expect(page.getByRole('dialog', { name: 'Fixture Working' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);

  // Another member's private spell: its author opens it (the precondition), B gets no modal.
  await signInAgainAs(page, coven.users.A);
  await page.goto(`${grimoire}?spell=${secret}`);
  await expect(page.getByRole('dialog', { name: 'Fixture Secret' })).toBeVisible();
  await signInAgainAs(page, coven.users.B);
  await page.goto(`${grimoire}?spell=${secret}`);
  await expect(page.getByRole('link', { name: 'Quick Look Fixture Working' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Fixture Secret')).toHaveCount(0);

  // A member of an unrelated coven sees nothing of this one.
  await signInAgainAs(page, other.users.D);
  await page.goto(`${grimoire}?spell=${shared}`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Fixture Working')).toHaveCount(0);
});
