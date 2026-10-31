import { assertNoAccessibilityViolations } from './axe';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { destinationMenu } from './stories/ingredient-dialogs';

// A MenuButton's menu hangs from its button's end edge and stays on screen (claude-docs/components/menu-button.md,
// "Contracts"), measured on the bar's Add Ingredient chevron at a desktop width and the narrowest phone.
// At the desktop width the page is scanned with the menu open, as happy-dom cannot run axe on a placed menu.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// Where there is room, the menu's end edge is the chevron's; at the phone the
// menu is wider than the room before the chevron's end, so it is shifted back
// onto the screen instead (Floating UI's shift, MenuButton/index.tsx).
for (const { viewport, hangs } of [
  { viewport: { width: 1280, height: 800 }, hangs: true },
  { viewport: { width: 320, height: 640 }, hangs: false },
]) {
  test(`the Add Ingredient menu opens under the chevron, inside a ${viewport.width}px window`, async ({
    page,
  }) => {
    const first = await seedCoven(page, 'Fixture Edge Coven', `edge-${viewport.width}.test`, {
      A: 'owner',
    });
    const second = await seedCoven(
      page,
      'Fixture Second Edge Coven',
      `edge-second-${viewport.width}.test`,
      { G: 'owner' },
    );
    const owner = second.users.G!;
    const member = first.users.A!;
    // A writes to both covens, so the bar draws the chevron and its menu.
    await withSql((sql) =>
      sql.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', ${owner}, true)`;
        await tx`
          insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
          values (${second.id}, ${member}, 'member', ${owner}, ${owner})`;
      }),
    );
    await signInAgainAs(page, member);
    await page.setViewportSize(viewport);
    await page.goto('/account');

    const { toggle, menu, choices } = destinationMenu(page);
    await toggle.click();
    await expect(choices).toHaveCount(2);
    // Let the fade and the first placement settle before measuring.
    await page.waitForTimeout(300);

    const button = (await toggle.boundingBox())!;
    const box = (await menu.boundingBox())!;
    // Why it could fail: the menu is wider than the chevron, so a menu hung
    // from the chevron's start edge would run off the window's end.
    expect(box.width).toBeGreaterThan(button.width);
    // Within a pixel: the boxes are measured in fractions of one.
    if (hangs)
      expect(Math.abs(box.x + box.width - (button.x + button.width))).toBeLessThanOrEqual(1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(button.y + button.height);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    if (hangs) await assertNoAccessibilityViolations(page);
  });
}
