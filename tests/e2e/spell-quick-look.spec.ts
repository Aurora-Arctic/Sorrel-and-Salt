import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, localIngredient, seedCoven, withSql } from './stories/coven-ingredients';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the eye opens a spell in a modal over the list, keeps the filter, stacks ingredient details and refuses as set out', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Look', 'spell-look.test', {
    A: 'owner',
    B: 'member',
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
    const testwort = await localIngredient(sql, coven.id, coven.users.A);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${coven.users.B}, true)`;
      await tx`insert into spell_steps (spell_id, ingredient_id, variant_id, position, quantity, unit, created_by, updated_by)
        values (${shared}, ${testwort.ingredientId}, ${testwort.variantId}, 1, 2, 'tsp', ${coven.users.B}, ${coven.users.B})`;
    });
    return [
      shared,
      await insertSpell(sql, coven.id, 'Fixture Secret', 'private', coven.users.A, 'complete'),
      testwort.ingredientId,
    ];
  });
  const other = await seedCoven(page, 'Fixture Coven Look X', 'spell-look-x.test', { D: 'owner' });
  const grimoire = `/coven/${coven.slug}/grimoire`;

  await signInAgainAs(page, coven.users.B);
  await page.goto(`${grimoire}?query=fixture`);
  const eye = page.getByRole('link', { name: 'Quick Look Fixture Working' });
  await eye.click();
  await expect(page).toHaveURL(`${grimoire}?query=fixture&spell=${shared}`);
  const look = page.getByRole('dialog', { name: 'Fixture Working' });
  await expect(look).toBeVisible();
  await expect(look.getByRole('link', { name: 'See Full Spell' })).toHaveAttribute(
    'href',
    `${grimoire}/${shared}`,
  );

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
  // Focus is back on the step's eye, whose tip opens with it; the next Escape is the tip's,
  // which keeps the modal open around it (claude-docs/components/icon-tip.md, "Contracts").
  const stepEye = look.getByRole('link', { name: 'Quick Look Testwort' });
  await expect(stepEye).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(look).toBeVisible();
  await expect(stepEye).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(`${grimoire}?query=fixture`);
  await expect(page.getByRole('dialog')).toHaveCount(0);

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
