import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// An open step is closed by a click or focus outside it, never by a click on a label, a gap or the
// padding inside it: those cannot take focus, so the browser drops it on the dialog around the row
// (a real-browser behaviour jsdom does not show).
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function clickAt(page: Page, row: Locator, dx: number, dy: number) {
  const box = (await row.boundingBox())!;
  await page.mouse.click(box.x + dx, box.y + dy);
}

test('an open step stays open for a click on anything inside its fields', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Stays Open', 'stays-open.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await page.getByRole('dialog', { name: 'New Spell' }).waitFor();
  await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Rosemary (Herb)');
  await page
    .getByRole('option', { name: 'Rosemary (Herb)' })
    .filter({ hasNotText: 'as a one-off ingredient' })
    .first()
    .click();
  const row = page.getByRole('list', { name: 'Steps' }).getByRole('listitem').first();
  const pencil = row.getByRole('button', { name: /^(Edit|Close) / });
  await expect(pencil).toHaveAttribute('aria-expanded', 'true');

  const closed: string[] = [];
  const probe = async (label: string, act: () => Promise<unknown>) => {
    await act();
    await page.waitForTimeout(150);
    const state = await pencil.getAttribute('aria-expanded');
    if (state !== 'true') {
      closed.push(label);
      await pencil.click();
      await expect(pencil).toHaveAttribute('aria-expanded', 'true');
    }
  };

  await probe('quantity', () => row.getByRole('spinbutton', { name: /^Quantity/ }).click());
  await probe('quantity label', () =>
    row
      .locator('label', { hasText: /^Quantity/ })
      .first()
      .click(),
  );
  await probe('unit combobox', () => row.getByRole('combobox', { name: /^Unit/ }).click());
  await probe('unit option', () => page.getByRole('option', { name: 'g', exact: true }).click());
  await probe('unit chevron/clear', async () => {
    for (const b of await row.locator('.step-row__unit button').all()) await b.click();
  });
  await probe('unit again + escape', async () => {
    await row.getByRole('combobox', { name: /^Unit/ }).click();
    await page.keyboard.press('Escape');
  });
  await probe('instruction', () => row.locator('textarea').first().click());
  await probe('instruction label', () =>
    row
      .locator('label', { hasText: /nstruction/ })
      .first()
      .click(),
  );
  await probe('note', async () => {
    if (await row.locator('.step-row__note').isVisible())
      await row.locator('.step-row__note').click();
  });
  await probe('inputs gap', async () => {
    const inputs = row.locator('.step-row__inputs');
    const b = (await inputs.boundingBox())!;
    await page.mouse.click(b.x + b.width - 2, b.y + 2);
  });
  await probe('open area padding', async () => {
    const o = row.locator('.step-row__open');
    const b = (await o.boundingBox())!;
    await page.mouse.click(b.x + 2, b.y + b.height - 2);
  });
  await probe('card padding bottom', async () => {
    const b = (await row.boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height - 2);
  });
  await probe('card padding left', () => clickAt(page, row, 2, 40));
  expect(closed).toEqual([]);
});
