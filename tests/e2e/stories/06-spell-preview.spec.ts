import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';
import { insertSpell, insertStep, localIngredient, seedCoven, withSql } from './coven-ingredients';
import { makeVariant } from '../../support/fixtures/ingredient';

// Spell Preview, the spell full screen with nothing else on it (story 85).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test(
  'a member or viewer opens a spell full screen with everything the printed spell shows',
  { tag: '@story-85' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Five', 'story-85.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const spellId = await withSql(async (sql) => {
      const held = await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Previewwort',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Root' })],
      });
      const id = await insertSpell(
        sql,
        coven.id,
        'Fixture Working',
        'workspace',
        coven.users.A,
        'complete',
      );
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, coven.users.A);
      return id;
    });
    const recipePath = `/coven/${coven.slug}/grimoire/${spellId}`;
    // This story is the pane with nothing but Close; a wake lock sign is story 86's.
    await page.addInitScript(() => Reflect.deleteProperty(Navigator.prototype, 'wakeLock'));

    for (const user of [coven.users.B, coven.users.C]) {
      await signInAgainAs(page, user);
      await page.goto(recipePath);
      const preview = page.getByRole('button', { name: /^Preview Spell/ });
      // Scrolled a little first, so the return to the same place is a fact and not the top.
      await page.evaluate(() => {
        document.body.style.minHeight = '3000px';
        window.scrollTo(0, 120);
      });
      const before = await page.evaluate(() => window.scrollY);
      expect(before).toBeGreaterThan(0);
      await preview.click();
      const pane = page.getByRole('dialog', { name: 'Fixture Working' });
      await expect(pane).toBeVisible();
      const steps = pane.getByRole('list', { name: 'Steps' }).getByRole('listitem');
      await expect(steps).toHaveCount(1);
      await expect(steps).toContainText('Fixture Previewwort');
      await expect(steps).toContainText('2 g');
      // The Ingredients section the printed spell keeps, with the amount beside the name.
      await expect(
        pane.getByRole('list', { name: 'Ingredients' }).getByRole('listitem'),
      ).toContainText('Fixture Previewwort');
      // Nothing but Close to press, and nothing to follow away.
      await expect(pane.getByRole('button')).toHaveCount(1);
      await expect(pane.getByRole('link')).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
      await page.keyboard.press('Escape');
      await expect(pane).toHaveCount(0);
      await expect(preview).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      // Close does the same.
      await preview.click();
      await page
        .getByRole('dialog', { name: 'Fixture Working' })
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(preview).toBeFocused();
    }
  },
);

test('a non-member gets a 404 for the spell', { tag: '@story-85' }, async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Eighty-Five B', 'story-85b.test', {
    A: 'owner',
    B: 'member',
  });
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
  );
  const recipePath = `/coven/${coven.slug}/grimoire/${spellId}`;
  // The precondition: the same address opens for a member, so the 404 below is the guard's.
  await signInAgainAs(page, coven.users.B);
  expect((await page.goto(recipePath))?.status()).toBe(200);
  await expect(page.getByRole('button', { name: /^Preview Spell/ })).toBeVisible();
  await signInAs(page, 'd@story-85b.test');
  expect((await page.goto(recipePath))?.status()).toBe(404);
  await expect(page.getByRole('button', { name: /^Preview Spell/ })).toHaveCount(0);
});

// Keeping the screen awake in the pane (story 86). The browser's lock is stood in for by one that counts, since a
// headless browser grants none.
test(
  'the pane keeps the screen awake, says so, and lets it be turned off',
  { tag: '@story-86' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Six', 'story-86.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
    );
    await page.addInitScript(() => {
      const counts = { requests: 0, releases: 0 };
      Reflect.set(window, 'wakeCounts', counts);
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: () => {
            counts.requests += 1;
            const listeners: (() => void)[] = [];
            return Promise.resolve({
              addEventListener: (_type: string, fn: () => void) => listeners.push(fn),
              release: () => {
                counts.releases += 1;
                listeners.forEach((fn) => fn());
                return Promise.resolve();
              },
            });
          },
        },
      });
    });
    const counts = () =>
      page.evaluate(
        () => Reflect.get(window, 'wakeCounts') as { requests: number; releases: number },
      );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await page.getByRole('button', { name: /^Preview Spell/ }).click();
    const pane = page.getByRole('dialog', { name: 'Fixture Working' });
    const awake = pane.getByRole('button', { name: 'Screen Awake' });
    await expect(awake).toHaveAttribute('aria-pressed', 'true');
    expect(await counts()).toEqual({ requests: 1, releases: 0 });
    await assertNoAccessibilityViolations(page);
    // The background is there and hidden from assistive technology, and under reduced motion nothing
    // in it moves.
    const scene = pane.locator('.spell-preview__scene');
    await expect(scene).toHaveAttribute('aria-hidden', 'true');
    const running = () =>
      scene.evaluate(
        (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await running()).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await running()).toBe(0);
    // Off releases the lock; on asks again.
    await awake.click();
    await expect(awake).toHaveAttribute('aria-pressed', 'false');
    expect(await counts()).toEqual({ requests: 1, releases: 1 });
    await awake.click();
    await expect(awake).toHaveAttribute('aria-pressed', 'true');
    expect(await counts()).toEqual({ requests: 2, releases: 1 });
    // Closing the pane releases it.
    await pane.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await counts()).toEqual({ requests: 2, releases: 2 });
  },
);
