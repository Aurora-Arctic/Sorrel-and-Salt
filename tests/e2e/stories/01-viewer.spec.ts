import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import {
  cardsIn,
  compendiumVariant,
  editedAt,
  graphqlFromPage,
  ingredientList,
  insertSpell,
  insertStock,
  localIngredient,
  rowOf,
  seedCoven,
  stockEditor,
  withSql,
} from './coven-ingredients';

// What a coven's members read of its ingredients and its grimoire, and who last touched a jar. The first flow
// is a `fixme` until its annotated task builds the pages it walks.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The grimoire's list of spells, named after its page as the ingredient list is. */
function grimoireList(page: Page): Locator {
  return page.getByRole('list', { name: 'Grimoire' });
}

/**
 * Every control in the page's main region that starts a write, by the verb its name opens with: Add
 * Ingredient, New Spell, Edit Stock, Delete Coven, Remove a member, Invite. Matched by verb, so a new write
 * control under one of these verbs is caught too.
 */
const WRITE_VERB = /^(Add|New|Create|Edit|Delete|Remove|Invite|Change|Make|Save)\b/;

function writeControls(page: Page): Locator {
  const main = page.getByRole('main');
  return main
    .getByRole('button', { name: WRITE_VERB })
    .or(main.getByRole('link', { name: WRITE_VERB }));
}

/**
 * A field a member edits stock or a spell's visibility with; a viewer is offered none. The filter form (the
 * `search` landmark) is left out, since its switches change nothing stored; `:not(search *)` skips it.
 */
function editingFields(page: Page): Locator {
  const main = page.getByRole('main');
  const outsideFilter = page.locator(':not(search *)');
  return main
    .getByRole('spinbutton')
    .and(outsideFilter)
    .or(main.getByRole('switch').and(outsideFilter))
    .or(main.getByLabel('Visibility').and(outsideFilter));
}

test(
  'a viewer reads the ingredients and the grimoire a member reads, and is offered no write and refused every one',
  { tag: '@story-12' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Twelve', 'story-12.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const { A, B, C } = coven.users;
    const { testwort, stockId, spellId } = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, B, { folkNames: ['Fixture Root'] });
      const stockId = await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        B,
      );
      const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
      await insertStock(sql, coven.id, rosemary, { quantity: 20, unit: 'g', threshold: 10 }, B);
      const spellId = await insertSpell(
        sql,
        coven.id,
        'Fixture Working',
        'workspace',
        B,
        'complete',
      );
      return { testwort, stockId, spellId };
    });
    const ingredientsPath = `/coven/${coven.slug}/ingredients`;
    const grimoirePath = `/coven/${coven.slug}/grimoire`;

    await test.step('a member reads both lists, with the write controls a viewer must not get', async () => {
      // Why the viewer's empty-handedness below could pass wrongly: the same
      // pages offer a member their writes, so their absence is the role's.
      await signInAgainAs(page, B);
      await page.goto(ingredientsPath);
      await expect(cardsIn(ingredientList(page))).toHaveCount(2);
      await expect(rowOf(ingredientList(page), 'Testwort')).toBeVisible();
      await expect(rowOf(ingredientList(page), 'Rosemary')).toBeVisible();
      await expect(writeControls(page).first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Add Ingredient', disabled: false }),
      ).toBeVisible();

      await page.goto(grimoirePath);
      await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
      await expect(rowOf(grimoireList(page), 'Fixture Working')).toBeVisible();
      await expect(writeControls(page).first()).toBeVisible();
    });

    await test.step('the viewer reads the same rows, and no write control appears', async () => {
      await signInAgainAs(page, C);

      const ingredients = await page.goto(ingredientsPath);
      expect(ingredients?.status()).toBe(200);
      await expect(cardsIn(ingredientList(page))).toHaveCount(2);
      await expect(rowOf(ingredientList(page), 'Testwort')).toBeVisible();
      await expect(rowOf(ingredientList(page), 'Rosemary')).toBeVisible();
      await expect(writeControls(page)).toHaveCount(0);
      await expect(editingFields(page)).toHaveCount(0);
      // The shell's Add Ingredient adds to the coven whose page it is on
      // (claude-docs/components/app-shell.md): absent or disabled here.
      await expect(
        page.getByRole('button', { name: 'Add Ingredient', disabled: false }),
      ).toHaveCount(0);
      await expect(rowOf(ingredientList(page), 'Rosemary')).toBeVisible();
      await assertNoAccessibilityViolations(page);

      const grimoire = await page.goto(grimoirePath);
      expect(grimoire?.status()).toBe(200);
      await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
      await expect(rowOf(grimoireList(page), 'Fixture Working')).toBeVisible();
      await expect(writeControls(page)).toHaveCount(0);
      await expect(editingFields(page)).toHaveCount(0);
      await expect(rowOf(grimoireList(page), 'Fixture Working')).toBeVisible();
      await assertNoAccessibilityViolations(page);

      // The coven's own page: Leave Coven is the viewer's, Delete Coven the owner's alone.
      await page.goto(`/coven/${coven.slug}`);
      await expect(page.getByRole('button', { name: 'Leave Coven' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete Coven' })).toHaveCount(0);
      await expect(writeControls(page)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Leave Coven' })).toBeVisible();
    });

    await test.step('the viewer is refused at every write address', async () => {
      // The people pages answer a viewer as a stranger (tests/e2e/coven.spec.ts).
      // There is no edit address for an ingredient row: stock is edited in place
      // and the edit modal opens from the row.
      for (const path of [`/coven/${coven.slug}/invitations`, `/coven/${coven.slug}/members`]) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(404);
      }
      // The spell builder is a dialog over the grimoire: its address
      // shows a viewer the grimoire, and no dialog.
      await page.goto(`/coven/${coven.slug}/grimoire?new=spell-${coven.slug}`);
      await expect(page.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    await test.step('every write sent straight to /api/graphql is refused, with nothing changed', async () => {
      await page.goto(ingredientsPath);
      await expect(rowOf(ingredientList(page), 'Testwort')).toBeVisible();
      const before = await withSql(
        (sql) => sql`select updated_at from ingredients where id = ${testwort.ingredientId}`,
      );

      const attempts: [string, Record<string, unknown>][] = [
        [
          'mutation ($w: ID!) { createWorkspaceIngredient(workspaceId: $w, input: { name: "Fixture Viewerwort", variants: [] }) { id } }',
          { w: coven.id },
        ],
        [
          'mutation ($w: ID!, $id: ID!) { deleteIngredient(workspaceId: $w, id: $id) }',
          { w: coven.id, id: testwort.ingredientId },
        ],
        // The stock removal; its arguments follow deleteIngredient's.
        [
          'mutation ($w: ID!, $id: ID!) { deleteStock(workspaceId: $w, id: $id) }',
          { w: coven.id, id: stockId },
        ],
        [
          'mutation ($w: ID!) { createInvitation(workspaceId: $w, email: "invited@story-12.test", role: member) { id } }',
          { w: coven.id },
        ],
        [
          'mutation ($w: ID!, $u: ID!) { removeMember(workspaceId: $w, userId: $u) }',
          { w: coven.id, u: B },
        ],
        [
          'mutation ($w: ID!, $u: ID!) { updateMemberRole(workspaceId: $w, userId: $u, role: viewer) { role } }',
          { w: coven.id, u: B },
        ],
        ['mutation ($w: ID!) { deleteWorkspace(workspaceId: $w) }', { w: coven.id }],
      ];
      for (const [query, variables] of attempts) {
        const answer = await graphqlFromPage(page, query, variables);
        expect(answer.errors?.[0]?.extensions?.code, query).toBe('FORBIDDEN');
      }

      await withSql(async (sql) => {
        const [ingredient] = await sql`
          select updated_at, deleted_at from ingredients where id = ${testwort.ingredientId}`;
        expect(ingredient.updated_at).toEqual(before[0].updated_at);
        expect(ingredient.deleted_at).toBeNull();
        const [stock] = await sql`
          select quantity_on_hand::float as quantity, deleted_at from inventory_items where id = ${stockId}`;
        expect(stock).toEqual({ quantity: 4, deleted_at: null });
        const [spell] = await sql`select visibility, deleted_at from spells where id = ${spellId}`;
        expect(spell).toEqual({ visibility: 'workspace', deleted_at: null });
        const local = await sql`
          select id from ingredients where workspace_id = ${coven.id} and name = 'Fixture Viewerwort'`;
        expect(local).toHaveLength(0);
        const invitations = await sql`select id from invitations where workspace_id = ${coven.id}`;
        expect(invitations).toHaveLength(0);
        const members = await sql<{ user_id: string; role: string }[]>`
          select user_id, role from workspace_members
          where workspace_id = ${coven.id} and deleted_at is null`;
        expect(Object.fromEntries(members.map((m) => [m.user_id, m.role]))).toEqual({
          [A]: 'owner',
          [B]: 'member',
          [C]: 'viewer',
        });
        const [workspace] = await sql`select deleted_at from workspaces where id = ${coven.id}`;
        expect(workspace.deleted_at).toBeNull();
      });
    });
  },
);

test(
  "a member's edit to a jar names them and the time on the ingredient's card, to every member and the viewer alike",
  { tag: '@story-13' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Thirteen', 'story-13.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const { A, B, C } = coven.users;
    const stockId = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, A);
      return insertStock(sql, coven.id, testwort, { quantity: 1, unit: 'piece', threshold: 0 }, A);
    });
    const path = `/coven/${coven.slug}/ingredients`;
    const row = rowOf(ingredientList(page), 'Testwort');
    const jarStamp = async () => {
      const [stamp] = await withSql(
        (sql) => sql<{ updated_by: string; updated_at: Date; quantity: number }[]>`
          select updated_by, updated_at, quantity_on_hand::float as quantity
          from inventory_items where id = ${stockId}`,
      );
      return stamp;
    };

    await test.step('before the edit the card names A, who wrote the entry and its jar', async () => {
      // The answer must move when B edits.
      await signInAgainAs(page, B);
      await page.goto(path);
      await expect(row).toContainText('Fixture A');
      await expect(row).not.toContainText('Fixture B');
    });

    await test.step("B changes the jar's quantity, and the card names B and the moment", async () => {
      const editor = stockEditor(row, 'Testwort');
      await editor.open.click();
      await editor.jar('Root').quantity.fill('2');
      await editor.save.click();
      await expect(editor.dialog).toHaveCount(0);

      await expect(row).toContainText('Fixture B');
      await expect(row).not.toContainText('Fixture A');
      const stamp = await jarStamp();
      expect(stamp).toMatchObject({ updated_by: B, quantity: 2 });
      await expectEditedAt(row, stamp.updated_at);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('A and the viewer C read the same name and moment', async () => {
      const { updated_at: at } = await jarStamp();
      for (const reader of [A, C]) {
        await signInAgainAs(page, reader);
        await page.goto(path);
        await expect(row).toContainText('Fixture B');
        await expect(row).not.toContainText('Fixture A');
        await expectEditedAt(row, at);
      }
    });
  },
);

/**
 * The card's `<time>` stands for `at`, the jar's own `updated_at`, to the second (the attribute may drop the
 * microseconds). The server's HTML holds the short absolute date, which the browser swaps for the relative
 * phrase on load; it is fetched from inside the page so the request carries its session.
 */
async function expectEditedAt(row: Locator, at: Date) {
  const time = editedAt(row);
  await expect(time).toHaveAttribute('datetime', /.+/);
  const datetime = (await time.getAttribute('datetime')) ?? '';
  expect(Math.abs(Date.parse(datetime) - at.getTime())).toBeLessThan(1000);

  const served = await row.page().evaluate(async (moment) => {
    const html = await (await fetch(location.href)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector(`time[datetime="${moment}"]`)?.textContent ?? null;
  }, datetime);
  // The absolute date the server drew: the edit's day, in UTC.
  expect(served).toContain(String(at.getUTCFullYear()));
  expect(served).toContain(String(at.getUTCDate()));
  await expect(time).toBeVisible();
  // Once the page has loaded the visible text is the relative phrase, in place of the date.
  await expect(time).toHaveText(/ ago$|^just now$/);
}
