import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  insertSpell,
  insertStep,
  insertWorking,
  compendiumVariant,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The recipe page's screen layout: Workings closes the main column, under the body, and never
// stands in the side column that holds the jar panels.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`Workings sits at the bottom of the main column on a ${name}`, async ({ page }) => {
    const coven = await seedCoven(page, `Fixture Coven ${name}`, `spell-layout-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      const id = await insertSpell(sql, coven.id, 'Fixture Layout', 'workspace', A, 'complete');
      await sql`update spells set note = 'A closing note' where id = ${id}`;
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
      await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const box = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => el.getBoundingClientRect().toJSON());
    const workings = await box(page.getByRole('heading', { name: 'Workings' }));
    const steps = await box(page.getByRole('list', { name: 'Steps' }));
    const note = await box(page.getByText('A closing note'));
    const aside = await box(page.getByRole('complementary', { name: 'The Jar' }));

    // The rows carry no list marker.
    const marker = await page
      .getByRole('list', { name: 'Workings' })
      .getByRole('listitem')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').content);
    expect(['none', 'normal']).toContain(marker);

    // Under the body, in the body's column.
    expect(workings.top).toBeGreaterThan(note.bottom);
    expect(workings.left).toBeLessThan(steps.left + 4);
    // Not in the side column: on a desktop it is beside it, on a phone above it.
    if (name === 'desktop') expect(workings.right).toBeLessThanOrEqual(aside.left);
    else expect(workings.bottom).toBeLessThan(aside.top);
  });
}
