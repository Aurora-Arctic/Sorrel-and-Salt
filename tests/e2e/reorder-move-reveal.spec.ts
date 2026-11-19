import type { Locator, Page } from '@playwright/test';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { GRIP_NAME } from '../support/grip-name';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { PHONE_TOUCH } from './breakpoints';
import { recreateE2eDatabase, withE2eSql } from './database';
import { hitTarget, isSeen } from './hit-target';
import { signInAgainAs, signInAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import { hydrated } from './waits';

// Every sortable list draws its grips with no Reorder toggle, and a row's Move Up and Move Down show only while the
// pointer is over the row or the focus is inside it; the Guides list keeps its Reorder Mode, and inside it rows behave
// the same (claude-docs/components/grip-handle.md). Only a real layout shows what is on screen and what a press lands on.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

interface SortableRow {
  row: Locator;
  grip: Locator;
  up: Locator;
  down: Locator;
}

/** A row of `within` by its grip's item name, with its own Move buttons; `role` is what the row is drawn as. */
function sortableRow(within: Locator, role: 'row' | 'listitem', item: string): SortableRow {
  const grip = within.getByRole('button', { name: `Move ${item}`, exact: true });
  return {
    // The innermost item holding the grip, as a step or a guide may sit inside another list's item.
    row: within.getByRole(role).filter({ has: grip }).last(),
    grip,
    up: within.getByRole('button', { name: `Move Up ${item}`, exact: true }),
    down: within.getByRole('button', { name: `Move Down ${item}`, exact: true }),
  };
}

async function expectTargetAtLeast24(control: Locator): Promise<void> {
  const target = await hitTarget(control);
  expect(target.width).toBeGreaterThanOrEqual(24);
  expect(target.height).toBeGreaterThanOrEqual(24);
}

/**
 * The reveal on one row, against a second row that must stay hidden: at rest, on hover, and on focus, then the Tab
 * order from the grip, each target's size, and the axe scan with the buttons shown. The caller leaves the focus
 * outside both rows.
 */
async function proveReveal(page: Page, target: SortableRow, other: SortableRow): Promise<void> {
  // Precondition: both rows are drawn with their grips.
  await expect(target.grip).toBeVisible();
  await expect(other.grip).toBeVisible();
  await page.mouse.move(0, 0);

  // At rest the buttons are in the page and in the Tab order, but not on screen.
  for (const button of [target.up, target.down]) {
    await expect(button).toBeAttached();
    await expect(button).not.toHaveAttribute('tabindex', '-1');
    await expect.poll(() => isSeen(button)).toBe(false);
  }

  await target.row.hover();
  await expect.poll(() => isSeen(target.up)).toBe(true);
  await expect.poll(() => isSeen(target.down)).toBe(true);
  await expect.poll(() => isSeen(other.up)).toBe(false);

  await page.mouse.move(0, 0);
  await target.grip.focus();
  await expect.poll(() => isSeen(target.up)).toBe(true);
  await expect.poll(() => isSeen(other.up)).toBe(false);

  await page.keyboard.press('Tab');
  await expect(target.up).toBeFocused();
  await expect.poll(() => isSeen(target.up)).toBe(true);
  await expectTargetAtLeast24(target.up);
  await page.keyboard.press('Tab');
  await expect(target.down).toBeFocused();
  await expectTargetAtLeast24(target.down);

  await assertNoAccessibilityViolations(page);
}

/** Move Down on the first of two rows moves it one place, keeps the focus and the buttons, and each end is unavailable. */
async function proveMoveDown(
  page: Page,
  first: SortableRow,
  second: SortableRow,
  order: () => Promise<string[]>,
  names: [string, string],
): Promise<void> {
  await expect.poll(order).toEqual(names);
  await expect(first.up).toHaveAttribute('aria-disabled', 'true');
  await expect(second.down).toHaveAttribute('aria-disabled', 'true');
  await expect(first.down).not.toHaveAttribute('aria-disabled', 'true');

  await first.down.focus();
  await page.keyboard.press('Enter');

  await expect.poll(order).toEqual([names[1], names[0]]);
  await expect(first.down).toBeFocused();
  await expect.poll(() => isSeen(first.down)).toBe(true);
  await expect(first.down).toHaveAttribute('aria-disabled', 'true');
  await expect(second.up).toHaveAttribute('aria-disabled', 'true');
}

/** The items in `within`, in the order their grips are drawn. */
const gripOrder = (within: Locator) =>
  within
    .getByRole('button', { name: GRIP_NAME })
    .evaluateAll((grips) =>
      grips.map((grip) => (grip.getAttribute('aria-label') ?? '').replace(/^Move /, '')),
    );

const blur = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/** A new spell with two one-off steps, Testwort then Testroot. */
async function openSpellWithTwoSteps(page: Page, name: string, domain: string): Promise<Locator> {
  const coven = await seedCoven(page, name, domain, { A: 'owner', B: 'member' });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await page.getByRole('dialog', { name: 'New Spell' }).waitFor();
  for (const step of ['Testwort', 'Testroot']) {
    await page.getByRole('combobox', { name: 'Add to Jar' }).fill(step);
    await page.getByRole('option', { name: `Add "${step}" as a one-off ingredient` }).click();
    // A new step opens; closed, it leaves the next pick's list uncovered at a phone.
    await page.getByRole('button', { name: `Close ${step}`, exact: true }).click();
  }
  const steps = page.getByRole('list', { name: 'Steps' });
  await expect(steps.getByRole('button', { name: GRIP_NAME })).toHaveCount(2);
  return steps;
}

/** A keeper, and a public guide holding two sub pages, `first` then `second`; returns the guide's id. */
async function seedGuide(
  page: Page,
  key: string,
  guide: string,
  [first, second]: [string, string],
): Promise<string> {
  const { userId } = await signInAs(page, `e@${key}.test`, ['discord'], 'admin');
  return withE2eSql(async (sql) => {
    const id = await insertHelpArticle(
      sql,
      { kind: 'guide', title: guide, slug: `${key}-guide`, audience: 'public', position: 101 },
      userId,
    );
    await insertHelpArticle(
      sql,
      { title: first, slug: `${key}-first`, parent_id: id, position: 1 },
      userId,
    );
    await insertHelpArticle(
      sql,
      { title: second, slug: `${key}-second`, parent_id: id, position: 2 },
      userId,
    );
    return id;
  });
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Help Outline' });

async function openSubPageTable(page: Page, guide: string): Promise<Locator> {
  await page.goto('/keepers/help');
  await nav(page).getByRole('link', { name: guide }).click();
  const table = page.getByRole('table', { name: `Sub Pages of ${guide}` });
  await expect(table.getByRole('button', { name: GRIP_NAME })).toHaveCount(2);
  return table;
}

test.describe('at a desktop width', () => {
  test('spell steps: no Reorder Steps toggle, and each step reveals its Move buttons on hover and focus', async ({
    page,
  }) => {
    const steps = await openSpellWithTwoSteps(page, 'Fixture Coven Reveal', 'reveal-steps.test');
    const testwort = sortableRow(steps, 'listitem', 'Testwort');
    const testroot = sortableRow(steps, 'listitem', 'Testroot');

    // Soft, so the reveal below is proved too while the toggle is still drawn.
    await expect.soft(page.getByRole('button', { name: 'Reorder Steps' })).toHaveCount(0);
    await blur(page);
    await proveReveal(page, testroot, testwort);
    await proveMoveDown(page, testwort, testroot, () => gripOrder(steps), ['Testwort', 'Testroot']);
  });

  test('a guide’s sub page table: no Reorder toggle, and each row reveals its Move buttons on hover and focus', async ({
    page,
  }) => {
    const [first, second] = ['Testwort Reveal Bark', 'Testwort Reveal Pith'];
    await seedGuide(page, 'reveal-table', 'Testwort Reveal Guide', [first, second]);
    const table = await openSubPageTable(page, 'Testwort Reveal Guide');
    const bark = sortableRow(table, 'row', first);
    const pith = sortableRow(table, 'row', second);

    await expect
      .soft(page.getByRole('button', { name: 'Reorder Sub Pages of Testwort Reveal Guide' }))
      .toHaveCount(0);
    await blur(page);
    await proveReveal(page, pith, bark);
    await proveMoveDown(
      page,
      bark,
      pith,
      async () =>
        (await table.getByRole('rowheader').allTextContents()).flatMap((text) =>
          [first, second].filter((title) => text.includes(title)),
        ),
      [first, second],
    );
  });

  test('the FAQ table: no Reorder toggle, and each row reveals its Move buttons on hover and focus', async ({
    page,
  }) => {
    const [first, second] = ['Why Testwort Reveal?', 'Why Testroot Reveal?'];
    const { userId } = await signInAs(page, 'e@reveal-faq.test', ['discord'], 'admin');
    await withE2eSql(async (sql) => {
      await insertHelpArticle(
        sql,
        { title: first, slug: 'why-testwort-reveal', kind: 'faq', position: 201 },
        userId,
      );
      await insertHelpArticle(
        sql,
        { title: second, slug: 'why-testroot-reveal', kind: 'faq', position: 202 },
        userId,
      );
    });
    await page.goto('/keepers/help?view=faq');
    const table = page.getByRole('table', { name: 'FAQ' });

    await expect(table.getByRole('button', { name: `Move ${first}`, exact: true })).toBeVisible();
    await expect.soft(page.getByRole('button', { name: 'Reorder FAQ' })).toHaveCount(0);
    await blur(page);
    await proveReveal(page, sortableRow(table, 'row', second), sortableRow(table, 'row', first));
  });

  test('an ordered combobox’s chips: no Reorder toggle, and each chip reveals its Move buttons on hover and focus', async ({
    page,
  }) => {
    const [first, second] = ['Testwort Chip Bark', 'Testwort Chip Pith'];
    const guide = await seedGuide(page, 'reveal-chips', 'Testwort Chip Guide', [first, second]);
    await page.goto(`/keepers/help/${guide}`);
    await hydrated(page, '.help-article-form input[name="title"]');
    const field = page.getByRole('group', { name: 'Sub Pages' });
    await expect(field.getByRole('button', { name: GRIP_NAME })).toHaveCount(2);
    const bark = sortableRow(field, 'listitem', first);
    const pith = sortableRow(field, 'listitem', second);

    await expect.soft(page.getByRole('button', { name: 'Reorder Sub Pages' })).toHaveCount(0);
    await blur(page);
    await proveReveal(page, pith, bark);
    await proveMoveDown(page, bark, pith, () => gripOrder(field), [first, second]);
  });

  test('the Guides list in Reorder Mode: each guide reveals its Move buttons on hover and focus', async ({
    page,
  }) => {
    const { userId } = await signInAs(page, 'e@reveal-guides.test', ['discord'], 'admin');
    const guides = ['Testwort Reveal Ash', 'Testwort Reveal Birch', 'Testwort Reveal Cedar'];
    await withE2eSql(async (sql) => {
      for (const [index, title] of guides.entries()) {
        await insertHelpArticle(
          sql,
          {
            kind: 'guide',
            title,
            slug: `testwort-reveal-guide-${index}`,
            audience: 'public',
            position: 301 + index,
          },
          userId,
        );
      }
    });
    await page.goto('/keepers/help');
    await nav(page).getByRole('button', { name: 'Reorder' }).click();
    // The mode puts the focus on the first grip, which is never Birch's or Cedar's: Ash is above them.
    await expect(nav(page).getByRole('button', { name: GRIP_NAME }).first()).toBeFocused();
    await expect(
      nav(page).getByRole('button', { name: `Move ${guides[1]}`, exact: true }),
    ).not.toBeFocused();

    const list = nav(page).getByRole('list', { name: 'Public', exact: true });
    await proveReveal(
      page,
      sortableRow(list, 'listitem', guides[1]),
      sortableRow(list, 'listitem', guides[2]),
    );
  });

  test('the Guides toggle moves the focus to the first grip when turned on, and back to itself when turned off or on Escape', async ({
    page,
  }) => {
    await signInAs(page, 'e@reveal-guides-focus.test', ['discord'], 'admin');
    await page.goto('/keepers/help');
    const toggle = nav(page).getByRole('button', { name: 'Reorder' });
    const firstGrip = nav(page).getByRole('button', { name: GRIP_NAME }).first();
    // Precondition: the seed holds guides, so the list has a first grip to take the focus.
    await expect(nav(page).getByRole('link').first()).toBeVisible();

    await toggle.click();
    await expect(firstGrip).toBeFocused();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(firstGrip).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toBeFocused();
  });
});

test.describe('on a touch phone', () => {
  test.use(PHONE_TOUCH);

  test('tapping a step’s grip shows that step’s Move buttons and no other’s', async ({ page }) => {
    const steps = await openSpellWithTwoSteps(page, 'Fixture Coven Tap', 'reveal-tap.test');
    const testwort = sortableRow(steps, 'listitem', 'Testwort');
    const testroot = sortableRow(steps, 'listitem', 'Testroot');
    await blur(page);
    await expect(testroot.up).toBeAttached();
    await expect.poll(() => isSeen(testroot.up)).toBe(false);

    await testroot.grip.tap();

    await expect.poll(() => isSeen(testroot.up)).toBe(true);
    await expect.poll(() => isSeen(testroot.down)).toBe(true);
    await expect.poll(() => isSeen(testwort.up)).toBe(false);
  });

  test('tapping a sub page card’s grip shows that card’s Move buttons and no other’s', async ({
    page,
  }) => {
    await signInAs(page, 'e@reveal-tap-table.test', ['discord'], 'admin');
    // A phone picks its guide from a list, and opens on the first guide, whose sub pages the seed holds.
    await page.goto('/keepers/help');
    const cards = page.getByRole('table', { name: /^Sub Pages of / });
    await expect(cards.getByRole('button', { name: GRIP_NAME }).nth(1)).toBeVisible();
    const [first = '', second = ''] = await gripOrder(cards);
    const bark = sortableRow(cards, 'row', first);
    const pith = sortableRow(cards, 'row', second);
    await blur(page);
    await expect(pith.up).toBeAttached();
    await expect.poll(() => isSeen(pith.up)).toBe(false);

    await pith.grip.tap();

    await expect.poll(() => isSeen(pith.up)).toBe(true);
    await expect.poll(() => isSeen(pith.down)).toBe(true);
    await expect.poll(() => isSeen(bark.up)).toBe(false);
  });
});
