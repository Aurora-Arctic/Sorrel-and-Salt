import { insertHelpArticle } from '../support/db/insert-help-article';
import { test, expect } from './fixtures';
import { recreateE2eDatabase, withE2eSql } from './database';
import { signInAs } from './session';

// Move Up and Move Down on a reorderable list, in a real browser: a keyed reorder moves the focused button's row in
// the page, which a browser may blur (claude-docs/components/grip-handle.md).

const GUIDE = 'Testwort Elder Guide';
const FIRST = 'Testwort Elder Bark';
const SECOND = 'Testwort Elder Pith';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('Move Up keeps the focus on the moved row’s button, and each end of the list is aria-disabled', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'e@help-move-buttons.test', ['discord'], 'admin');
  await withE2eSql(async (sql) => {
    const guide = await insertHelpArticle(
      sql,
      {
        kind: 'guide',
        title: GUIDE,
        slug: 'testwort-elder-guide',
        audience: 'public',
        position: 101,
      },
      userId,
    );
    await insertHelpArticle(
      sql,
      { title: FIRST, slug: 'testwort-elder-bark', parent_id: guide, position: 1 },
      userId,
    );
    await insertHelpArticle(
      sql,
      { title: SECOND, slug: 'testwort-elder-pith', parent_id: guide, position: 2 },
      userId,
    );
  });

  await page.goto('/keepers/help');
  await page
    .getByRole('navigation', { name: 'Help Outline' })
    .getByRole('link', { name: GUIDE })
    .click();
  const table = page.getByRole('table', { name: `Sub Pages of ${GUIDE}` });
  const titles = async () =>
    (await table.getByRole('rowheader').allTextContents()).map((text) =>
      [FIRST, SECOND].find((title) => text.includes(title)),
    );
  // Precondition: Bark first, Pith second, and each end's outward move is unavailable.
  await expect.poll(titles).toEqual([FIRST, SECOND]);
  await page.getByRole('button', { name: `Reorder Sub Pages of ${GUIDE}` }).click();
  await expect(table.getByRole('button', { name: `Move Up ${FIRST}` })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(table.getByRole('button', { name: `Move Down ${SECOND}` })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  const up = table.getByRole('button', { name: `Move Up ${SECOND}` });
  await expect(up).not.toHaveAttribute('aria-disabled', 'true');

  await up.focus();
  await page.keyboard.press('Enter');

  await expect(
    page.getByRole('status').filter({ hasText: `Moved ${SECOND} to position 1.` }),
  ).toBeAttached();
  await expect.poll(titles).toEqual([SECOND, FIRST]);
  // Pith is now the first row, so its Move Up is the unavailable one, and it still holds the focus.
  await expect(up).toHaveAttribute('aria-disabled', 'true');
  await expect(up).toBeFocused();
  await expect(table.getByRole('button', { name: `Move Down ${FIRST}` })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  // Pressing it again at the top moves nothing and keeps the focus.
  await page.keyboard.press('Enter');
  await expect(up).toBeFocused();
  await page.reload();
  await expect.poll(titles).toEqual([SECOND, FIRST]);
});
