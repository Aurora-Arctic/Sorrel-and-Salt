import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs, signInAgainAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import type { Coven } from './stories/coven-ingredients';
import { holdServerAnswers } from './hold-server-answers';
import { hydrated } from './waits';

// At phone width a table's rows are cards, and a table on its way draws each row as one block in the
// card's frame, as tall as that list's real stacked row (claude-docs/loading.md).

/** How far a placeholder row may be from a real stacked row's height, in pixels. */
const HEIGHT_TOLERANCE = 2;

let coven: Coven;
let keeperId: string;
let cardId: string;

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage();
  try {
    coven = await seedCoven(setup, 'Fixture Coven Rows', 'stack-row-skeleton.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    keeperId = (await signInAs(setup, 'keeper@stack-row-skeleton.test', ['discord'], 'admin'))
      .userId;
    await withSql(async (sql) => {
      await sql`
        insert into invitations (workspace_id, email, role, token_hash, expires_at, created_by, updated_by)
        values (${coven.id}, 'invited@stack-row-skeleton.test', 'member', 'hash-1', now() + interval '7 days', ${coven.users.A}, ${coven.users.A})`;
      await sql`
        insert into invitations (email, site_role, token_hash, expires_at, created_by, updated_by)
        values ('keeper-invited@stack-row-skeleton.test', 'admin', 'hash-2', now() + interval '7 days', ${keeperId}, ${keeperId})`;
      await sql`
        insert into invitations (kind, batch_id, position, token_hash, expires_at, created_by, updated_by)
        values ('card', pg_catalog.gen_random_uuid(), 1, 'hash-3', now() + interval '7 days', ${keeperId}, ${keeperId})`;
      await sql`
        insert into invitations (kind, batch_id, position, token_hash, expires_at, accepted_at, accepted_by, created_by, updated_by)
        values ('card', pg_catalog.gen_random_uuid(), 1, 'hash-4', now() + interval '7 days', now(), ${coven.users.C}, ${keeperId}, ${keeperId})`;
      const [card] = await sql`select id from invitations where token_hash = 'hash-4'`;
      cardId = card.id;
      await sql`
        insert into card_invitation_attempts (invitation_id, user_id, reason, created_by, updated_by)
        values (${cardId}, ${coven.users.C}, 'accepted', ${keeperId}, ${keeperId})`;
      await sql`
        insert into user_privilege_changes (user_id, privilege, change, via, created_by, updated_by)
        values (${coven.users.A}, 'create_workspace', 'grant', 'admin', ${keeperId}, ${keeperId})`;
      await sql`
        insert into support_requests (about, subject, message, path, created_by, updated_by)
        values ('bug', 'Fixture request', 'A fixture message.', '/compendium', ${coven.users.A}, ${coven.users.A})`;
    });
  } finally {
    await setup.close();
  }
});

const REAL = 'table.data-table--stack:not(.data-table--pending) > tbody > tr';
const PLACEHOLDER = 'table.data-table--pending > tbody > tr';

const heightOf = (page: Page, selector: string) =>
  page.evaluate((css) => {
    const row = [...document.querySelectorAll<HTMLElement>(css)].find(
      (element) => !element.closest('[inert]') || css.includes('pending'),
    );
    return row ? row.getBoundingClientRect().height : null;
  }, selector);

// Each list, the address it lives at, and a page to move from that holds the wait.
// The account page's received invitations are left out: they load with the document, which `holdServerAnswers` cannot hold open.
// `{coven}` stands for the seeded coven’s slug, known only once `beforeAll` has run.
const lists: {
  kind: string;
  path: string;
  hub?: string;
  keeper?: boolean;
  modal?: boolean;
}[] = [
  { kind: 'users', path: '/keepers/users', keeper: true },
  {
    kind: 'privilege-changes',
    path: '/keepers/privilege-changes',
    hub: '/keepers/users',
    keeper: true,
  },
  { kind: 'keeper-invitations', path: '/keepers/invitations', hub: '/keepers/users', keeper: true },
  {
    kind: 'invitation-cards',
    path: '/keepers/invitation-cards',
    hub: '/keepers/invitations',
    keeper: true,
  },
  {
    kind: 'card-sign-ups',
    path: '/keepers/card-sign-ups',
    hub: '/keepers/invitations',
    keeper: true,
  },
  { kind: 'refused-opens', path: '/keepers/invitation-cards', keeper: true, modal: true },
  { kind: 'support', path: '/keepers/support', keeper: true },
  { kind: 'compendium', path: '/curator/compendium', hub: '/curator', keeper: true },
  { kind: 'groups', path: '/curator/category-groups', hub: '/curator/categories', keeper: true },
  { kind: 'values', path: '/curator/deities', hub: '/curator', keeper: true },
  { kind: 'members', path: '/coven/{coven}/members' },
  {
    kind: 'pending-invitations',
    path: `/coven/{coven}/invitations`,
    hub: `/coven/{coven}/members`,
  },
];

for (const theme of ['light', 'dark'] as const) {
  for (const entry of lists) {
    test(`at 375px, ${theme}, the ${entry.kind} list's placeholder row is as tall as a real row`, async ({
      page,
    }) => {
      const at = (address: string) => address.replace('{coven}', coven.slug);
      const list = { ...entry, path: at(entry.path), hub: entry.hub && at(entry.hub) };
      await page.setViewportSize({ width: 375, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      const server = await holdServerAnswers(page, { prefetch: 'pass', alsoGraphql: true });
      await signInAgainAs(page, list.keeper ? keeperId : coven.users.A);
      await page.goto(
        list.modal ? list.path : (list.hub ?? (list.keeper ? '/keepers' : `/coven/${coven.slug}`)),
      );
      const scope = list.modal ? 'dialog[open] ' : '';
      let opener = page.locator(`a[href="${list.path}"]`).first();
      if (list.modal) opener = page.getByRole('button', { name: /View Refused Opens/ }).first();
      await hydrated(page, list.modal ? 'main button' : `a[href="${list.path}"]`);
      server.hold();
      await opener.click({ timeout: 15_000 });
      await expect.poll(server.held).toBeGreaterThan(0);
      await expect
        .poll(() => heightOf(page, scope + PLACEHOLDER), { timeout: 5000 })
        .not.toBeNull();
      const placeholder = await heightOf(page, scope + PLACEHOLDER);
      await server.release();
      // The page being left stays drawn until the list arrives, so the real row is read once the placeholder is gone.
      await expect.poll(() => heightOf(page, scope + PLACEHOLDER)).toBeNull();
      await expect.poll(() => heightOf(page, scope + REAL)).not.toBeNull();
      const real = await heightOf(page, scope + REAL);
      expect(Math.abs((placeholder ?? 0) - (real ?? 0))).toBeLessThanOrEqual(HEIGHT_TOLERANCE);
    });
  }
}
