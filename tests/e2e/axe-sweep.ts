import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import { ingredientSlug } from '@/lib/slugify';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { accessibilityFindings, type AxeFinding } from './axe';
import type { Persona, ScannedModal, ScannedRoute } from './axe-scans';
import { signInAgainAs, signInAs } from './session';
import {
  compendiumVariant,
  insertSpell,
  insertStep,
  insertStock,
  insertWorking,
  localIngredient,
  openFilters,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The accessibility sweep's harness: the rows a sweep scans over, the address each listed route is visited at,
// and how each listed modal is opened. Typed by the scan list, so a route or modal added to tests/e2e/axe-scans.ts
// without a visit or an opener here fails the type check.

const sha256Hex = (token: string) => createHash('sha256').update(token).digest('hex');

/** Everything one sweep test scans over, seeded fresh for it: one coven, its spells and ingredients, and the tokens the token pages read. */
export interface World {
  tag: string;
  coven: { id: string; slug: string; name: string };
  /** The coven's members by role, and the paused practitioner. */
  members: { steward: string; practitioner: string; observer: string; paused: string };
  /** A second coven the steward holds, which holds the compendium entry too. */
  second: { id: string; slug: string };
  compendium: { name: string; slug: string; ingredientId: string };
  local: { name: string; ingredientId: string };
  spell: { id: string; title: string };
  draftId: string;
  /** A shipped help guide, which the keeper's edit page opens. */
  helpArticleId: string;
  /** Who the test signs in as, made by `signIn`. */
  userId?: string;
  email?: string;
  tokens: { invite: string; card: string; supportView?: string };
  supportRequestId?: string;
}

/** Seeds the world one sweep test scans: a coven of four with a stocked compendium entry, a local ingredient, a complete spell with a step and two workings, and a draft. */
export async function seedWorld(page: Page): Promise<World> {
  const tag = randomUUID().slice(0, 8);
  const name = `Fixture Coven Axe ${tag}`;
  const domain = `axe-${tag}.test`;
  const coven = await seedCoven(page, name, domain, {
    A: 'owner',
    B: 'member',
    C: 'viewer',
    P: 'member',
  });
  const second = await seedCoven(
    page,
    `Fixture Coven Axe Second ${tag}`,
    `axe-second-${tag}.test`,
    {
      S: 'owner',
    },
  );
  const steward = coven.users.A;

  return withSql(async (sql) => {
    // The steward holds a seat in the second coven too, so the public entry page asks which coven to annotate.
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${second.id}, ${steward}, 'owner', ${steward}, ${steward})`;
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStock(sql, coven.id, rosemary, { quantity: 20, unit: 'g', threshold: 5 }, steward);
    await insertStock(sql, second.id, rosemary, { quantity: 10, unit: 'g', threshold: 0 }, steward);
    const [entry] = await sql<{ canonical_name: string | null }[]>`
      select canonical_name from ingredients where id = ${rosemary.ingredientId}`;
    const local = await localIngredient(sql, coven.id, steward, { name: 'Fixture Axewort' });
    await insertStock(sql, coven.id, local, { quantity: 3, unit: 'g', threshold: 0 }, steward);

    const spellId = await insertSpell(
      sql,
      coven.id,
      'Fixture Working',
      'workspace',
      steward,
      'complete',
    );
    await insertStep(sql, spellId, rosemary, { quantity: 2, unit: 'g', position: 0 }, steward);
    await insertWorking(sql, spellId, steward, { workedOn: '2026-03-04', note: 'First brewing' });
    await insertWorking(sql, spellId, steward, { workedOn: '2026-02-01', status: 'draft' });
    const draftId = await insertSpell(
      sql,
      coven.id,
      'Fixture Draft',
      'workspace',
      steward,
      'draft',
    );

    const [guide] = await sql<{ id: string }[]>`
      select id from help_articles
      where kind = 'guide' and slug = 'getting-started' and deleted_at is null`;

    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${steward}, true)`;
      await tx`
        insert into workspace_member_pauses (workspace_id, user_id, note, created_by, updated_by)
        values (${coven.id}, ${coven.users.P}, 'Fixture pause', ${steward}, ${steward})`;
    });

    return {
      tag,
      coven: { id: coven.id, slug: coven.slug, name },
      members: {
        steward,
        practitioner: coven.users.B,
        observer: coven.users.C,
        paused: coven.users.P,
      },
      second: { id: second.id, slug: second.slug },
      compendium: {
        name: 'Rosemary',
        slug: ingredientSlug('Rosemary', entry.canonical_name),
        ingredientId: rosemary.ingredientId,
      },
      local: { name: 'Fixture Axewort', ingredientId: local.ingredientId },
      spell: { id: spellId, title: 'Fixture Working' },
      draftId,
      helpArticleId: guide.id,
      tokens: {
        invite: randomBytes(32).toString('base64url'),
        card: randomBytes(32).toString('base64url'),
      },
    };
  });
}

/** Signs `page` in as `persona` over `world`, adding the rows that persona's pages read. */
export async function signIn(page: Page, world: World, persona: Persona): Promise<void> {
  const email = `${persona.toLowerCase()}@axe-${world.tag}.test`;
  world.email = email;
  switch (persona) {
    case 'signedOut':
      await page.context().clearCookies();
      await addSignedOutRequest(world, email);
      return;
    case 'steward':
    case 'practitioner':
    case 'observer':
      world.userId = world.members[persona];
      await signInAgainAs(page, world.userId);
      return;
    case 'pausedMember':
      world.userId = world.members.paused;
      await signInAgainAs(page, world.userId);
      return;
    case 'curator':
    case 'keeper': {
      world.userId = (
        await signInAs(page, email, ['discord'], persona === 'keeper' ? 'admin' : 'curator')
      ).userId;
      if (persona === 'keeper') await addCardBatch(world);
      await addSupportRequest(world, world.members.observer);
      // Marked for curators, so the curator's Support page holds it too.
      await withSql(
        (sql) =>
          sql`update support_requests set curator_visible = true where id = ${world.supportRequestId!}`,
      );
      return;
    }
    case 'unverified':
      world.userId = (
        await signInAs(page, email, ['discord'], 'user', { emailVerified: false })
      ).userId;
      return;
    case 'unagreed':
      world.userId = (
        await signInAs(page, email, ['discord'], 'user', { termsAgreed: false })
      ).userId;
      return;
    case 'pausedAccount':
      world.userId = (await signInAs(page, email)).userId;
      await withSql((sql) =>
        sql.begin(async (tx) => {
          await tx`select set_config('app.current_user_id', ${world.userId!}, true)`;
          await tx`
            insert into user_access_pauses (user_id, note, created_by, updated_by)
            values (${world.userId!}, 'Fixture pause', ${world.userId!}, ${world.userId!})`;
        }),
      );
      return;
    case 'invitee':
      world.userId = (await signInAs(page, email)).userId;
      await withSql((sql) =>
        sql.begin(async (tx) => {
          await tx`select set_config('app.current_user_id', ${world.members.steward}, true)`;
          await tx`
            insert into invitations (workspace_id, email, role, token_hash, created_by, updated_by)
            values (${world.coven.id}, ${email}, 'viewer', ${sha256Hex(world.tokens.invite)},
              ${world.members.steward}, ${world.members.steward})`;
        }),
      );
      return;
    case 'user':
      // Two sign-in methods, so either can be removed and Remove asks first.
      world.userId = (await signInAs(page, email, ['discord', 'google'])).userId;
      await addCardBatch(world);
      await addSupportRequest(world, world.userId);
      await withSql(
        (sql) => sql`
          insert into passkeys (name, public_key, user_id, credential_id, counter, device_type, backed_up)
          values ('Fixture Key', 'fixture-public-key', ${world.userId!}, ${`fixture-${world.tag}`}, 0, 'singleDevice', false)`,
      );
      return;
  }
}

/** A card batch of one, its token kept, created by the steward, with one refused open: the keeper's tab lists it and `/i/<token>` reads it. */
async function addCardBatch(world: World): Promise<void> {
  const by = world.members.steward;
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${by}, true)`;
      await tx`
        insert into invitations (kind, token_hash, batch_id, position, note, created_by, updated_by)
        values ('card', ${sha256Hex(world.tokens.card)}, ${randomUUID()}, 1, 'Fixture batch', ${by}, ${by})`;
      await tx`
        insert into card_invitation_attempts (invitation_id, user_id, reason, created_by, updated_by)
        select id, ${world.members.observer}, 'expired', ${by}, ${by}
        from invitations where token_hash = ${sha256Hex(world.tokens.card)}`;
    }),
  );
}

/** A signed-in support request from `sender`. */
async function addSupportRequest(world: World, sender: string): Promise<void> {
  const [row] = await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${sender}, true)`;
      return tx<{ id: string }[]>`
        insert into support_requests (about, subject, message, path, created_by, updated_by)
        values ('question', 'Fixture question', 'Where is the moon table?', '/compendium', ${sender}, ${sender})
        returning id`;
    }),
  );
  world.supportRequestId = row.id;
}

/** A signed-out request from `email`, with a view token the sweep holds, as its receipt's link would carry. */
async function addSignedOutRequest(world: World, email: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${SIGNED_OUT_SENDER_ID}, true)`;
      await tx`
        insert into support_requests (about, subject, message, path, sender_email, view_token_hash,
          view_token_expires_at, created_by, updated_by)
        values ('question', 'Fixture question', 'Where is the moon table?', '/compendium', ${email},
          ${sha256Hex(token)}, now() + interval '30 days', ${SIGNED_OUT_SENDER_ID}, ${SIGNED_OUT_SENDER_ID})`;
    }),
  );
  world.tokens.supportView = token;
}

/** The address each listed route is visited at; null for a route with no page yet. */
export const ROUTE_VISITS: Record<ScannedRoute, (world: World) => string | null> = {
  '/': () => '/',
  '/[...missing]': () => '/no-page-answers-this',
  '/compendium': () => '/compendium',
  '/compendium/ingredients/[slug]': (w) => `/compendium/ingredients/${w.compendium.slug}`,
  '/privacy': () => '/privacy',
  '/privacy/versions/[number]': () => '/privacy/versions/1',
  '/disclaimer': () => '/disclaimer',
  '/disclaimer/versions/[number]': () => '/disclaimer/versions/1',
  '/code-of-ethics': () => '/code-of-ethics',
  '/code-of-ethics/versions/[number]': () => '/code-of-ethics/versions/1',
  '/terms': () => '/terms',
  '/terms/versions/[number]': () => '/terms/versions/1',
  '/support': () => '/support',
  '/support/request': (w) => `/support/request#${w.tokens.supportView}`,
  '/sign-in': () => '/sign-in',
  '/forgot-password': () => '/forgot-password',
  '/reset-password': () => '/reset-password?token=fixture-not-a-token',
  // The shipped help, which the standard seed loads.
  '/help': () => '/help',
  '/help/glossary': () => '/help/glossary',
  '/help/search': () => '/help/search?q=coven',
  '/help/[slug]': () => '/help/getting-started',
  '/help/[slug]/[child]': () => '/help/getting-started/signing-in',
  '/help/staff': () => '/help/staff',
  '/help/staff/[slug]': () => '/help/staff/curating-a-compendium-entry',
  '/help/staff/[slug]/[child]': () =>
    '/help/staff/curating-a-compendium-entry/source-an-entry-with-references',
  '/coven': () => '/coven',
  '/coven/new': () => '/coven/new',
  '/invite/[token]': (w) => `/invite/${w.tokens.invite}`,
  '/i/[token]': (w) => `/i/${w.tokens.card}`,
  '/account': () => '/account',
  '/account/sign-in': () => '/account/sign-in',
  '/account/support': () => '/account/support',
  '/account/email': () => '/account/email',
  '/account/terms': () => '/account/terms',
  '/access-paused': () => '/access-paused',
  '/coven-paused/[slug]': (w) => `/coven-paused/${w.coven.slug}`,
  '/coven/[slug]': (w) => `/coven/${w.coven.slug}`,
  '/coven/[slug]/members': (w) => `/coven/${w.coven.slug}/members`,
  '/coven/[slug]/invitations': (w) => `/coven/${w.coven.slug}/invitations`,
  '/coven/[slug]/ingredients': (w) => `/coven/${w.coven.slug}/ingredients`,
  '/coven/[slug]/ingredients/[id]': (w) =>
    `/coven/${w.coven.slug}/ingredients/${w.local.ingredientId}`,
  '/coven/[slug]/grimoire': (w) => `/coven/${w.coven.slug}/grimoire`,
  '/coven/[slug]/grimoire/drafts': (w) => `/coven/${w.coven.slug}/grimoire/drafts`,
  '/coven/[slug]/grimoire/[id]': (w) => `/coven/${w.coven.slug}/grimoire/${w.spell.id}`,
  '/curator': () => '/curator',
  '/curator/compendium': () => '/curator/compendium',
  '/curator/categories': () => '/curator/categories',
  '/curator/category-groups': () => '/curator/category-groups',
  '/curator/forms': () => '/curator/forms',
  '/curator/form-groups': () => '/curator/form-groups',
  '/curator/celestial-bodies': () => '/curator/celestial-bodies',
  '/curator/zodiac-signs': () => '/curator/zodiac-signs',
  '/curator/deities': () => '/curator/deities',
  '/curator/deity-traditions': () => '/curator/deity-traditions',
  '/keepers': () => '/keepers',
  '/keepers/support': () => '/keepers/support',
  '/keepers/users': () => '/keepers/users',
  '/keepers/privilege-changes': () => '/keepers/privilege-changes',
  '/keepers/invitations': () => '/keepers/invitations',
  '/keepers/invitation-cards': () => '/keepers/invitation-cards',
  '/keepers/card-sign-ups': () => '/keepers/card-sign-ups',
  '/keepers/business-cards': () => '/keepers/business-cards',
  '/keepers/documents': () => '/keepers/documents',
  '/keepers/documents/[key]': () => '/keepers/documents/terms',
  '/keepers/help': () => '/keepers/help',
  '/keepers/help/new': () => '/keepers/help/new',
  '/keepers/help/[id]': (w) => `/keepers/help/${w.helpArticleId}`,
};

const dialogNamed = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
/** A ConfirmDialog asks before an action, so it is an alert dialog. */
const confirmNamed = (page: Page, name: string) =>
  page.getByRole('alertdialog', { name, exact: true });

/** Opens `path` and waits for what it loads to finish showing. */
export async function visit(page: Page, path: string, status?: number): Promise<void> {
  const response = await page.goto(path);
  if (response && (status ? response.status() !== status : response.status() >= 400)) {
    throw new Error(`${path} answered ${response.status()}`);
  }
  // A redirect means the page meant was not the one scanned.
  const wanted = new URL(path, page.url()).pathname;
  if (new URL(page.url()).pathname !== wanted) {
    throw new Error(`${path} redirected to ${new URL(page.url()).pathname}`);
  }
  await settle(page);
}

/** Waits until nothing on the page says it is still loading. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}

/** How each listed modal is opened, as the persona the scan list names; each returns the open dialog. */
export const MODAL_OPENERS: Record<ScannedModal, (page: Page, world: World) => Promise<Locator>> = {
  support: async (page) => {
    await visit(page, '/account?support=');
    return dialogNamed(page, 'Contact Support');
  },
  discard: async (page) => {
    await visit(page, '/support');
    await page
      .getByRole('main')
      .getByLabel(/^Subject/)
      .fill('Fixture subject');
    await page.getByRole('banner').getByRole('link', { name: 'Compendium' }).first().click();
    return dialogNamed(page, 'Discard Changes?');
  },
  'sign-in': async (page) => {
    await visit(page, '/compendium');
    await page.getByRole('banner').getByRole('link', { name: 'Sign In' }).click();
    return dialogNamed(page, 'Sign In');
  },
  'add-ingredient': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients?new=ingredient-coven-${w.coven.slug}`);
    return dialogNamed(page, 'Add Ingredient');
  },
  'unlink-provider': async (page) => {
    await visit(page, '/account/sign-in');
    await page.getByRole('button', { name: /^Remove Discord/ }).click();
    return dialogNamed(page, 'Remove Sign-In Method');
  },
  passkey: async (page) => {
    await visit(page, '/account/sign-in');
    await page.getByRole('button', { name: 'Rename Fixture Key', exact: true }).click();
    return dialogNamed(page, 'Rename Passkey');
  },
  'two-factor-warning': async (page) => openTwoFactorWarning(page),
  'my-request': async (page, w) => {
    await visit(page, `/account/support?request=${w.supportRequestId}`);
    return page.getByRole('dialog', { name: /Fixture question/ });
  },
  'help-screenshot': async (page) => {
    await visit(page, '/help/grimoire/build-a-spell');
    await page
      .getByRole('button', { name: /^Enlarge: / })
      .first()
      .click();
    return dialogNamed(page, 'Screenshot');
  },
  member: async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/members?member=${w.members.practitioner}`);
    return dialogNamed(page, 'Fixture B');
  },
  invite: async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/members`);
    await page
      .getByRole('button', { name: /^Invite/ })
      .first()
      .click();
    return page.getByRole('dialog').first();
  },
  leave: async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}`);
    await page.getByRole('button', { name: 'Leave Coven' }).click();
    return dialogNamed(page, 'Leave Coven');
  },
  filters: async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients`);
    return openFilters(page);
  },
  stock: async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients`);
    await page
      .getByRole('button', { name: /^Edit Stock, Rosemary/ })
      .first()
      .click();
    return page.getByRole('dialog', { name: /^Edit Stock, Rosemary/ });
  },
  'quick-look': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire/${w.spell.id}`);
    await page
      .getByRole('link', { name: /^Quick Look Rosemary/ })
      .first()
      .click();
    return page.getByRole('dialog').first();
  },
  'entry-edit': async (page, w) => {
    await visit(
      page,
      `/coven/${w.coven.slug}/ingredients/${w.local.ingredientId}?edit=${w.local.ingredientId}`,
    );
    return page.getByRole('dialog', { name: /^Edit Ingredient/ });
  },
  'entry-details': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients?entry=${w.local.ingredientId}`);
    return page.getByRole('dialog', { name: new RegExp(w.local.name) });
  },
  'entry-annotate': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients/${w.compendium.ingredientId}?annotate`);
    return page.getByRole('dialog').first();
  },
  'annotate-picker': async (page, w) => {
    await visit(page, `/compendium/ingredients/${w.compendium.slug}`);
    await page.getByRole('button', { name: `More for ${w.compendium.name}`, exact: true }).click();
    await page.getByRole('menuitem', { name: /^Annotate/ }).click();
    return dialogNamed(page, 'Annotate');
  },
  'make-it-ours': async (page, w) => {
    await openEntryMenu(page, w);
    await page.getByRole('menuitem', { name: 'Make It Ours' }).click();
    return confirmNamed(page, 'Make It Ours');
  },
  'remove-from-cupboard': async (page, w) => {
    await openEntryMenu(page, w);
    await page.getByRole('menuitem', { name: 'Remove', exact: true }).click();
    return confirmNamed(page, 'Remove from Cupboard');
  },
  'edit-stock': async (page, w) => {
    await openEntryMenu(page, w);
    await page.getByRole('menuitem', { name: 'Edit Stock', exact: true }).click();
    return page.getByRole('dialog', { name: /^Edit Stock/ });
  },
  'delete-entry': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/ingredients/${w.local.ingredientId}`);
    await page.getByRole('button', { name: `More for ${w.local.name}`, exact: true }).click();
    await page.getByRole('menuitem', { name: /^Delete/ }).click();
    return confirmNamed(page, 'Delete Ingredient');
  },
  'entry-summary': async (page, w) => {
    await visit(
      page,
      `/coven/${w.coven.slug}/ingredients/${w.local.ingredientId}?edit=${w.local.ingredientId}`,
    );
    const dialog = page.getByRole('dialog', { name: /^Edit Ingredient/ });
    await dialog.getByRole('button', { name: 'Relations', exact: true }).click();
    const substitutes = dialog.getByRole('group', { name: 'Substitute Ingredients' }).first();
    await substitutes.getByRole('combobox').first().fill('Rosemary');
    await page
      .getByRole('option', { name: /^Rosemary/ })
      .first()
      .click();
    await substitutes
      .getByRole('button', { name: /^Rosemary/ })
      .first()
      .click();
    return dialog.getByRole('dialog').first();
  },
  'spell-builder': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire?new=spell`);
    return dialogNamed(page, 'New Spell');
  },
  'spell-look': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire`);
    await page
      .getByRole('link', { name: /^Quick Look Fixture Working/ })
      .first()
      .click();
    return page.getByRole('dialog').first();
  },
  'spell-preview': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire/${w.spell.id}`);
    await page.getByRole('button', { name: 'Preview' }).first().click();
    return page.getByRole('dialog').first();
  },
  'delete-spell': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire`);
    await page.getByRole('button', { name: `More for ${w.spell.title}`, exact: true }).click();
    await page.getByRole('menuitem', { name: /^Delete/ }).click();
    return confirmNamed(page, 'Delete Spell');
  },
  'record-working-card': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire`);
    await page
      .getByRole('list', { name: 'Spells' })
      .getByRole('button', { name: /^Record a Working/ })
      .first()
      .click();
    return dialogNamed(page, 'Record a Working');
  },
  'record-working': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire/${w.spell.id}`);
    await page
      .getByRole('list', { name: 'Workings' })
      .getByRole('button', { name: /^Edit/ })
      .first()
      .click();
    return page.getByRole('dialog', { name: /Working/ });
  },
  'complete-working': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire/${w.spell.id}`);
    await page
      .getByRole('list', { name: 'Workings' })
      .getByRole('button', { name: /^Complete/ })
      .first()
      .click();
    return dialogNamed(page, 'Complete Working');
  },
  'date-field': async (page, w) => {
    await visit(page, `/coven/${w.coven.slug}/grimoire/${w.spell.id}`);
    await page.getByRole('button', { name: 'Record a Working' }).first().click();
    const dialog = dialogNamed(page, 'Record a Working');
    await dialog.locator('[aria-haspopup="dialog"]').first().click();
    return dialogNamed(page, 'Choose a Day');
  },
  'compendium-entry': async (page) => {
    await visit(page, '/curator/compendium?new');
    return page.getByRole('dialog').first();
  },
  'vocabulary-value': async (page) => {
    await visit(page, '/curator/categories?new');
    return page.getByRole('dialog').first();
  },
  'vocabulary-group': async (page) => {
    await visit(page, '/curator/category-groups?new');
    return dialogNamed(page, 'Add Category Group');
  },
  'support-request': async (page, w) => {
    await visit(page, `/keepers/support?request=${w.supportRequestId}`);
    return page.getByRole('dialog', { name: /Fixture question/ });
  },
  user: async (page, w) => {
    await visit(page, `/keepers/users?user=${w.members.steward}`);
    return page.getByRole('dialog', { name: /Fixture A/ });
  },
  'user-confirm': async (page, w) => {
    await visit(page, `/keepers/users?user=${w.members.steward}`);
    // Inside the user dialog the confirm asks in place rather than in a modal of its own.
    const dialog = page.getByRole('dialog', { name: /^User, Fixture A/ });
    await dialog
      .getByRole('button', { name: /^Approve / })
      .first()
      .click();
    await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
    return dialog;
  },
  'keeper-invite': async (page) => {
    await visit(page, '/keepers/invitations?invite');
    return dialogNamed(page, 'New Invitation');
  },
  'mint-cards': async (page) => {
    await visit(page, '/keepers/invitation-cards?mint');
    return dialogNamed(page, 'Mint Cards');
  },
  'card-attempts': async (page) => {
    await visit(page, '/keepers/invitation-cards');
    await page
      .getByRole('main')
      .getByRole('button', { name: /^View Refused Opens, batch / })
      .first()
      .click();
    return page.getByRole('dialog', { name: /Batch / });
  },
  'date-range-field': async (page) => {
    await visit(page, '/keepers/invitation-cards');
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.locator('[aria-haspopup="dialog"]').first().click();
    return page.getByRole('dialog', { name: /^Choose .* Days$/ });
  },
  'document-link': async (page) => {
    await visit(page, '/keepers/documents/terms');
    await page.getByRole('textbox', { name: 'Document Text' }).click();
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    return dialogNamed(page, 'Add Link');
  },
};

/** The entry page of the coven's compendium entry, with its More menu open. */
async function openEntryMenu(page: Page, w: World): Promise<void> {
  await visit(page, `/coven/${w.coven.slug}/ingredients/${w.compendium.ingredientId}`);
  await page
    .getByRole('button', { name: new RegExp(`^More for ${w.compendium.name}`) })
    .first()
    .click();
}

const PASSWORD = 'lantern moss under the north window';

/** A password account part-way through turning two-factor on, at the question a Turn On without saved codes asks. */
async function openTwoFactorWarning(page: Page): Promise<Locator> {
  const email = `two-factor-${randomUUID()}@axe.test`;
  await page.context().clearCookies();
  const made = await page.request.post('/api/auth/sign-up/email', {
    data: { name: 'Testwort Doubled', email, password: PASSWORD },
  });
  expect(made.status(), await made.text()).toBe(200);
  const { agreedInForceSql } = await import('../support/db/agreement-in-force');
  await withSql(
    (sql) =>
      sql`update users set email_verified = true,
        (agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version) = (${agreedInForceSql(sql)}),
        terms_accepted_at = now() where email = ${email}`,
  );
  await page.context().clearCookies();
  await page.goto('/sign-in?method=email');
  const main = page.getByRole('main');
  await main.getByLabel(/^Email Address/).fill(email);
  await main.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
  await visit(page, '/account/sign-in');
  const section = page.getByRole('region', { name: 'Two-Factor Sign-In' });
  await section.getByLabel(/^Confirm Your Password/).fill(PASSWORD);
  await section.getByRole('button', { name: 'Turn On Two-Factor' }).click();
  const key = await section.locator('code.two-factor__key').textContent();
  const { totpCode } = await import('../support/two-factor');
  const appUri = `otpauth://totp/e2e?secret=${(key ?? '').replace(/[^A-Z2-7]/gi, '')}`;
  await section.getByLabel(/^Code From Your App/).fill(await totpCode(appUri));
  await section.getByRole('button', { name: 'Confirm and Turn On' }).click();
  return dialogNamed(page, 'Turn On Without Saving Your Codes?');
}

/** One place the sweep could not scan, with what the page held, so the opener can be corrected. */
export interface Unreached {
  scan: string;
  error: string;
  page: string;
}

export interface SweepResult {
  persona: Persona;
  findings: (AxeFinding & { scan: string; theme: 'dark' | 'light' })[];
  unreached: Unreached[];
}

/** Scans what is on screen in the dark theme and the light, the site's default first. */
export async function scanBothThemes(
  page: Page,
  scan: string,
  result: SweepResult,
  within?: Locator,
): Promise<void> {
  for (const theme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    if (within) await expect(within).toBeVisible();
    for (const finding of await accessibilityFindings(page)) {
      result.findings.push({ ...finding, scan, theme });
    }
  }
}

/** Records a scan that could not be reached, with the page's accessibility tree for the correction. */
export async function recordUnreached(
  page: Page,
  scan: string,
  error: unknown,
  result: SweepResult,
): Promise<void> {
  const tree = await page
    .locator('body')
    .ariaSnapshot({ timeout: 5_000 })
    .catch(() => '(no snapshot)');
  result.unreached.push({
    scan,
    error: (error instanceof Error ? error.message : String(error))
      .split('\n')
      .slice(0, 6)
      .join('\n'),
    page: `${page.url()}\n${tree}`,
  });
}

/** Writes a sweep's result under .reports for the fixer, and returns the failure summary, empty when clean. */
export function reportSweep(name: string, result: SweepResult): string {
  mkdirSync('.reports/axe-sweep', { recursive: true });
  writeFileSync(`.reports/axe-sweep/${name}.json`, JSON.stringify(result, null, 2));
  return [
    ...result.findings.map(
      (f) => `${f.scan} | ${result.persona} | ${f.theme} | ${f.rule} | ${f.selector} | ${f.help}`,
    ),
    ...result.unreached.map(
      (u) => `${u.scan} | ${result.persona} | not reached | ${u.error.split('\n')[0]}`,
    ),
  ].join('\n');
}
