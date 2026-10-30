import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import {
  compendiumVariant,
  insertSpell,
  insertStep,
  insertStock,
  insertWorking,
  openFilters,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

test('a seeded violation fails the scan', async ({ page }) => {
  await page.setContent(
    '<html><head><title>Fixture</title></head><body><img src="x.png"></body></html>',
  );
  await expect(assertNoAccessibilityViolations(page)).rejects.toThrow();
});

// A soft navigation removes the <title> and puts the next one back a
// moment later. The scan waits for it rather than reporting a page that has one.
test('a title that is briefly absent does not fail the scan', async ({ page }) => {
  await page.setContent(
    '<html lang="en"><head><title>Fixture</title></head><body><main><h1>Fixture</h1></main></body></html>',
  );
  await page.evaluate(() => {
    document.title = '';
    document.querySelector('title')?.remove();
    setTimeout(() => {
      document.head.append(
        Object.assign(document.createElement('title'), { textContent: 'Fixture' }),
      );
    }, 400);
  });
  await assertNoAccessibilityViolations(page);
});

// A soft navigation's metadata swap can land between the wait for a title and the scan's read of
// it, so the scan itself finds none. The document here reads a title for
// the wait (which reads the element, not this),
// none for the scan's first read, and a title again after: a gap that closed on its
// own, which the scan must not report. The count, not a timer, puts the gap where the race is.
test('a title that goes absent after the wait does not fail the scan', async ({ page }) => {
  await page.setContent(
    '<html lang="en"><head><title>Fixture</title></head><body><main><h1>Fixture</h1></main></body></html>',
  );
  await page.evaluate(() => {
    const real = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    let reads = 0;
    Object.defineProperty(document, 'title', {
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? '' : (real?.get?.call(document) ?? '');
      },
    });
  });
  await assertNoAccessibilityViolations(page);
});

// The grimoire's screens, each scanned in both themes: the list's tabs, its empty and no-match regions and its
// Filters, a card hovered and focused, the builder with a step open, Record a Working's two steps, and the
// recipe page with its workings and an ingredient's Quick Look. Each test seeds its own coven.

/** Scans the page in the dark theme and the light, the site's default first. */
async function scanBothThemes(page: Page) {
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await assertNoAccessibilityViolations(page);
  }
}

/** A coven owned by A, signed in, with one complete shared spell laying 2 g of a 20 g jar of Rosemary. */
async function covenWithSpell(page: Page, name: string, domain: string) {
  const coven = await seedCoven(page, name, domain, { A: 'owner' });
  const spellId = await withSql(async (sql) => {
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStock(
      sql,
      coven.id,
      rosemary,
      { quantity: 20, unit: 'g', threshold: 0 },
      coven.users.A,
    );
    const id = await insertSpell(
      sql,
      coven.id,
      'Fixture Working',
      'workspace',
      coven.users.A,
      'complete',
    );
    await insertStep(sql, id, rosemary, { quantity: 2, unit: 'g', position: 0 }, coven.users.A);
    return id;
  });
  return { ...coven, spellId };
}

test.describe('the grimoire', () => {
  test.beforeAll(async () => {
    await recreateE2eDatabase();
  });

  test('the Spells tab, compact, with a complete spell', async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe Spells', 'axe-spells.test');
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const list = page.getByRole('list', { name: 'Spells' });
    await expect(list).toHaveAttribute('data-density', 'compact');
    await expect(list.getByRole('link', { name: 'Fixture Working', exact: true })).toBeVisible();
    await scanBothThemes(page);
  });

  test('the Drafts tab with a draft', async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Axe Drafts', 'axe-drafts.test', {
      A: 'owner',
    });
    await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Draft', 'workspace', coven.users.A, 'draft'),
    );
    await page.goto(`/coven/${coven.slug}/grimoire/drafts`);
    await expect(
      page
        .getByRole('list', { name: 'Drafts' })
        .getByRole('link', { name: 'Fixture Draft', exact: true }),
    ).toBeVisible();
    await scanBothThemes(page);
  });

  test('a coven with no spells', async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Axe Empty', 'axe-empty.test', {
      A: 'owner',
    });
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await expect(page.getByRole('status', { name: 'No Spells' })).toBeVisible();
    await scanBothThemes(page);
  });

  test('a search that matches nothing', async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe No Match', 'axe-no-match.test');
    await page.goto(`/coven/${coven.slug}/grimoire?query=Nothingwort`);
    await expect(page.getByRole('status', { name: 'No Matches' })).toBeVisible();
    await scanBothThemes(page);
  });

  test('the Filters panel open', async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe Filters', 'axe-filters.test');
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await openFilters(page);
    await scanBothThemes(page);
  });

  test('a spell card hovered, with motion allowed, and its title focused', async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe Card', 'axe-card.test');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const card = page.getByRole('list', { name: 'Spells' }).getByRole('listitem').first();
    await card.hover();
    await scanBothThemes(page);
    await card.getByRole('link', { name: 'Fixture Working', exact: true }).focus();
    await scanBothThemes(page);
  });

  test('the spell builder with a step open', async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Axe Builder', 'axe-builder.test', {
      A: 'owner',
    });
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await page.getByRole('link', { name: 'New Spell' }).click();
    await expect(page.getByRole('dialog', { name: 'New Spell' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Rosemary (Herb)');
    await page
      .getByRole('option', { name: 'Rosemary (Herb)' })
      .filter({ hasNotText: 'as a one-off ingredient' })
      .first()
      .click();
    const step = page.getByRole('list', { name: 'Steps' }).getByRole('listitem').first();
    await expect(step.getByRole('button', { name: /^(Edit|Close) / })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await scanBothThemes(page);
  });

  test("Record a Working's first step and its confirm step", async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe Working', 'axe-working.test');
    await page.goto(`/coven/${coven.slug}/grimoire/${coven.spellId}`);
    await page.getByRole('button', { name: 'Record a Working' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    await expect(dialog.getByRole('combobox', { name: 'Participants' })).toBeVisible();
    await scanBothThemes(page);
    await dialog.getByRole('button', { name: 'Complete' }).click();
    await expect(dialog.getByRole('list', { name: 'Deductions' })).toContainText('2 g');
    await scanBothThemes(page);
  });

  test("the recipe page with workings, and an ingredient's Quick Look", async ({ page }) => {
    const coven = await covenWithSpell(page, 'Fixture Coven Axe Recipe', 'axe-recipe.test');
    await withSql(async (sql) => {
      await insertWorking(sql, coven.spellId, coven.users.A, {
        workedOn: '2026-03-04',
        note: 'First brewing',
      });
      await insertWorking(sql, coven.spellId, coven.users.A, {
        workedOn: '2026-02-01',
        status: 'draft',
      });
    });
    await page.goto(`/coven/${coven.slug}/grimoire/${coven.spellId}`);
    await expect(
      page.getByRole('list', { name: 'Workings' }).getByText('First brewing'),
    ).toBeVisible();
    await scanBothThemes(page);
    await page
      .getByRole('link', { name: /^Quick Look Rosemary/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await scanBothThemes(page);
  });
});
