import type { Locator } from '@playwright/test';
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

test(
  'the pane is open while the address carries ?preview, so a link or a refresh opens it',
  { tag: '@story-85' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Five C', 'story-85c.test', {
      A: 'owner',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
    );
    await page.addInitScript(() => Reflect.deleteProperty(Navigator.prototype, 'wakeLock'));
    await signInAgainAs(page, coven.users.A);
    const recipePath = `/coven/${coven.slug}/grimoire/${spellId}`;
    const pane = page.getByRole('dialog', { name: 'Fixture Working' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // A direct link opens the pane, a refresh keeps it, and Close drops the parameter.
    await page.goto(`${recipePath}?preview`);
    await expect(pane).toBeVisible();
    await page.reload();
    await expect(pane).toBeVisible();
    await pane.getByRole('button', { name: 'Close' }).click();
    await expect(pane).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('preview')).toBe(false);
    expect(new URL(page.url()).pathname).toBe(recipePath);

    // Opened from the button, Back closes it and Forward opens it again.
    await page.getByRole('button', { name: /^Preview Spell/ }).click();
    await expect(pane).toBeVisible();
    expect(new URL(page.url()).searchParams.has('preview')).toBe(true);
    await page.goBack();
    await expect(pane).toHaveCount(0);
    await page.goForward();
    await expect(pane).toBeVisible();
    expect(errors).toEqual([]);
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
    // An ember crosses a stop on its path at one speed: the same distance in the hundredth of its
    // life before the stop as after it. Checked by setting the animation's time, not by sampling.
    const stride = await pane
      .locator('.spell-preview__ember--edge')
      .first()
      .evaluate((el) => {
        const flight = el.getAnimations().find((a) => (a.effect as KeyframeEffect).target === el);
        if (!flight) throw new Error('the ember has no flight animation');
        const { delay, duration } = flight.effect!.getTiming() as {
          delay: number;
          duration: number;
        };
        flight.pause();
        const yAt = (fraction: number): number => {
          flight.currentTime = delay + duration * fraction;
          return el.getBoundingClientRect().top;
        };
        return [yAt(0.29) - yAt(0.3), yAt(0.3) - yAt(0.31)];
      });
    expect(Math.abs(stride[0] - stride[1])).toBeLessThan(0.5);
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

test(
  'the pane sets the Ingredients beside the steps and spaces the parts as the printed page does',
  { tag: '@story-85' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Columns', 'preview-columns.test', {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const first = await localIngredient(sql, coven.id, A, {
        name: 'Fixture Columnwort',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Root' })],
      });
      const second = await localIngredient(sql, coven.id, A, {
        name: 'Fixture Rowbane',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Leaf' })],
      });
      const id = await insertSpell(sql, coven.id, 'Fixture Columns', 'workspace', A, 'complete');
      await sql`update spells set intent = 'To set things side by side through a long night of careful work, when the lamp is low and the pen must not shake, and the page must be finished before the household wakes', jar_description = '4 oz jar', note = 'Seal it well, and keep the jar sealed until the moon turns, then open it only in daylight and never where a draught can reach the wax.' where id = ${id}`;
      await insertStep(sql, id, first, { quantity: 2, unit: 'g', position: 0 }, A);
      await insertStep(sql, id, second, { quantity: 3, unit: 'g', position: 1 }, A);
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    // What the two layouts share, in rem so paper's smaller type does not count: the gaps from the
    // title to the lead, the categories to the facts strip, the strip to the Ingredients row, that row
    // to the note, and one step to the next; and the lines the intent and the note break into, which
    // match only when the two columns hold the same characters.
    const layout = () =>
      page.evaluate(() => {
        const pane = document.querySelector('.spell-preview[open]');
        const root = pane ?? document;
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const box = (sel: string) => root.querySelector(sel)!.getBoundingClientRect();
        const lines = (sel: string) => {
          const range = document.createRange();
          range.selectNodeContents(root.querySelector(sel)!);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        };
        const title = box(pane ? '.spell-preview__title' : '.spell-recipe__head h1');
        const lead = box('.spell-recipe__lead');
        const facts = box('.spell-recipe__facts-box');
        const summary = box('.spell-recipe__summary');
        const note = box('.spell-recipe__note');
        const [one, two] = [...root.querySelector('ol[aria-label="Steps"]')!.children].map((el) =>
          el.getBoundingClientRect(),
        );
        return {
          headToLead: (lead.top - title.bottom) / rem,
          leadToFacts: (facts.top - lead.bottom) / rem,
          factsToRow: (summary.top - facts.bottom) / rem,
          rowToNote: (note.top - Math.max(summary.bottom, two!.bottom)) / rem,
          stepToStep: (two!.top - one!.bottom) / rem,
          intentLines: lines('.spell-recipe__intent'),
          noteLines: lines('.spell-recipe__note'),
        };
      });
    await page.emulateMedia({ media: 'print' });
    const printed = await layout();
    await page.emulateMedia({ media: 'screen' });

    const box = (locator: Locator) =>
      locator.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    await page.getByRole('button', { name: /^Preview Spell/ }).click();
    const pane = page.getByRole('dialog', { name: 'Fixture Columns' });
    await expect(pane).toBeVisible();
    const heading = pane.getByRole('heading', { name: 'Ingredients' });
    const instructions = pane.getByRole('heading', { name: 'Instructions' });
    const ingredients = pane.getByRole('list', { name: 'Ingredients' });
    const steps = pane.getByRole('list', { name: 'Steps' });

    // Wide: Ingredients to the left of the steps, its heading level with the Instructions heading
    // over them, and the column the printed sheet's width in the pane's rem.
    expect((await box(ingredients)).right).toBeLessThanOrEqual((await box(steps)).left);
    expect(Math.abs((await box(heading)).top - (await box(instructions)).top)).toBeLessThanOrEqual(
      1,
    );
    expect((await box(instructions)).bottom).toBeLessThanOrEqual((await box(steps)).top);
    // The close X ends where the content does.
    const close = await box(pane.getByRole('button', { name: 'Close' }));
    const content = await box(pane.locator('.spell-preview__content'));
    expect(Math.abs(close.right - content.right)).toBeLessThanOrEqual(1);
    // The pane's gaps are the printed page's, and its lines break where the printed ones do. Why
    // they could differ: the paper is 180mm wide at an 11pt root and the pane 742px at 16px.
    const shown = await layout();
    expect(printed.intentLines).toBeGreaterThan(1);
    expect(shown.intentLines).toBe(printed.intentLines);
    expect(shown.noteLines).toBe(printed.noteLines);
    for (const gap of [
      'headToLead',
      'leadToFacts',
      'factsToRow',
      'rowToNote',
      'stepToStep',
    ] as const) {
      // Within a tenth of a rem: paper's 11pt lines round to whole pixels differently.
      expect(Math.abs(shown[gap] - printed[gap]), gap).toBeLessThan(0.1);
    }

    // A phone: Ingredients above the steps.
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await box(ingredients)).bottom).toBeLessThanOrEqual((await box(steps)).top);
  },
);
