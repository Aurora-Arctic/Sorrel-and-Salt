import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import { PHONE_WIDTH } from './breakpoints';

// A list's Reorder toggle in a real layout: its pressed look, and at a phone an instruction step's grip, Move Up and
// Move Down stacked as an ingredient step's are. happy-dom draws neither.
test.use({ viewport: { width: PHONE_WIDTH, height: 812 } });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  expect(found, 'the control is drawn').not.toBeNull();
  return found!;
};

/** Whether the grip, Move Up and Move Down sit one above another, each under the last and sharing its column. */
async function stacked(controls: Locator[]) {
  const boxes = await Promise.all(controls.map(box));
  return boxes.slice(1).every((below, at) => {
    const above = boxes[at]!;
    const under = below.y >= above.y + above.height - 0.5;
    const sameColumn = below.x < above.x + above.width && above.x < below.x + below.width;
    return under && sameColumn;
  });
}

test('at a phone, Reorder Steps stacks an instruction step’s grip and arrows as an ingredient step’s, and looks pressed', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Reorder Toggle', 'reorder-toggle.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await page.getByRole('dialog', { name: 'New Spell' }).waitFor();
  const steps = page.getByRole('list', { name: 'Steps' }).getByRole('listitem');

  await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Testwort');
  await page.getByRole('option', { name: 'Add "Testwort" as a one-off ingredient' }).click();
  await page.getByRole('button', { name: 'Close Testwort' }).click();
  await page.getByRole('button', { name: 'Add Instruction' }).click();
  await steps.nth(1).getByRole('textbox', { name: 'Instruction' }).fill('Stir thrice');
  await steps.nth(1).getByRole('button', { name: 'Close Stir thrice' }).click();
  await expect(steps).toHaveCount(2);

  const toggle = page.getByRole('button', { name: 'Reorder Steps' });
  const look = () =>
    toggle.evaluate((button) => {
      const style = getComputedStyle(button);
      return [style.backgroundColor, style.borderColor, style.color, style.boxShadow].join(' | ');
    });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  // Precondition: the toggle is off, so no step offers its arrows.
  await expect(page.getByRole('button', { name: /^Move (Up|Down) / })).toHaveCount(0);
  // Read with the pointer elsewhere, so a hover look is not taken for the pressed one.
  await page.mouse.move(0, 0);
  const off = await look();

  await toggle.click();
  await page.mouse.move(0, 0);

  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await look(), 'the pressed look differs from the off look').not.toBe(off);

  const controls = (name: string) => [
    page.getByRole('button', { name: `Move ${name}`, exact: true }),
    page.getByRole('button', { name: `Move Up ${name}`, exact: true }),
    page.getByRole('button', { name: `Move Down ${name}`, exact: true }),
  ];
  // Precondition: the ingredient step stacks its three, the layout the instruction step must match.
  expect(await stacked(controls('Testwort')), 'the ingredient step stacks').toBe(true);
  expect(await stacked(controls('Stir thrice')), 'the instruction step stacks').toBe(true);

  // Sweep gap: the spell steps with the Reorder toggle on, at 375 px.
  await assertNoAccessibilityViolations(page);
});
