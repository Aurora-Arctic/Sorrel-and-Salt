import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// At phone width a step's controls stay inside its card, its handle is a 24 by 24 target at
// least, and a closed instruction shows two lines: real layout jsdom does not draw.
test.use({ viewport: { width: 375, height: 812 } });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a step at phone width keeps its controls inside the card and shows two lines of an instruction', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Phone Steps', 'phone-steps.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await page.getByRole('dialog', { name: 'New Spell' }).waitFor();
  const steps = page.getByRole('list', { name: 'Steps' }).getByRole('listitem');

  // A one-off carries a badge, the widest thing beside the name.
  await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Testwort');
  await page.getByRole('option', { name: 'Add "Testwort" as a one-off ingredient' }).click();
  await steps.first().getByRole('textbox', { name: /^Form/ }).fill('Dried Root');
  await page.getByRole('button', { name: 'Close Testwort (Dried Root)' }).click();
  await expect(steps.first()).toContainText('One-Off');

  const card = (await steps.first().boundingBox())!;
  for (const name of ['Edit Testwort (Dried Root)', 'Remove Testwort (Dried Root)']) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(box.x + box.width, `${name} ends inside the card`).toBeLessThanOrEqual(
      card.x + card.width,
    );
  }
  // The grip is drawn smaller than its target, so the target is measured where a press lands on it.
  const target = await page
    .getByRole('button', { name: 'Move Testwort (Dried Root)', exact: true })
    .evaluate((handle) => {
      const box = handle.getBoundingClientRect();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const lands = (dx: number, dy: number) => {
        const hit = document.elementFromPoint(x + dx, y + dy);
        return hit !== null && handle.contains(hit);
      };
      const reach = (dx: number, dy: number) => {
        let n = 0;
        while (n < 40 && lands(dx * (n + 1), dy * (n + 1))) n++;
        return n;
      };
      return { width: reach(-1, 0) + reach(1, 0) + 1, height: reach(0, -1) + reach(0, 1) + 1 };
    });
  expect(target.width).toBeGreaterThanOrEqual(24);
  expect(target.height).toBeGreaterThanOrEqual(24);

  // A long instruction, closed, shows two of its lines and cuts the rest.
  await page.getByRole('button', { name: 'Add Instruction' }).click();
  const instruction = steps.nth(1);
  await instruction
    .getByRole('textbox', { name: 'Instruction' })
    .fill(
      'Grind the dried root to a fine powder, sift it twice through muslin, and leave it to rest beside the window until the moon has risen over the hill',
    );
  await instruction.getByRole('button', { name: /^Close Grind the dried root/ }).click();
  const lines = await instruction.locator('.step-row__text').evaluate((text) => {
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    return {
      shown: Math.round(text.clientHeight / lineHeight),
      cut: text.scrollHeight > text.clientHeight,
    };
  });
  expect(lines).toEqual({ shown: 2, cut: true });
});
