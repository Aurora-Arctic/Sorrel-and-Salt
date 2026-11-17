import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { hydrated } from './waits';
import { signInAs, signInAgainAs } from './session';
import {
  compendiumVariant,
  insertSpell,
  insertStep,
  insertStock,
  localIngredient,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import type { Coven } from './stories/coven-ingredients';
import { holdServerAnswers } from './hold-server-answers';
import { PHONE_WIDTH, DESKTOP_WIDTH } from './breakpoints';

// A page's skeleton stands where the page will: every static part the skeleton draws (the header and its
// action, the tabs, the side menu, the toolbar, the filter row, the list's frame, its first card and the table's
// headings) is within 2px of the same part on the arrived page, and the site bar and the context row do
// not move when the skeleton replaces the old page. Text lengths, item counts and a table row's wrapped
// height are content, and are not compared (claude-docs/loading.md). The skeleton also draws no list marker and
// no border that the page lacks in the same place.

/** How far a static part may move between the skeleton and the page, in pixels. */
const TOLERANCE = 2;

// Short enough to stand on one line at 375px, as the skeleton's title bar does.
const SPELL_TITLE = 'Charmwort';

let coven: Coven;
let keeperId: string;
let spellId: string;
/** One signed-in browser state per user, built once per worker after the seed and shared by that user's cases. */
const sessions: Partial<
  Record<Navigation['as'], Awaited<ReturnType<BrowserContext['storageState']>>>
> = {};

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage();
  try {
    coven = await seedCoven(setup, 'Fixture Covenant', 'skeleton-layout.test', {
      A: 'owner',
      B: 'member',
    });
    keeperId = (await signInAs(setup, 'keeper@skeleton-layout.test', ['discord'], 'admin')).userId;
    const { A } = coven.users;
    await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      await insertStock(sql, coven.id, held, { quantity: 40, unit: 'g', threshold: 0 }, A);
      const own = await localIngredient(sql, coven.id, A);
      await insertStock(sql, coven.id, own, { quantity: 3, unit: 'piece', threshold: 0 }, A);
      // A typical card: an intent and three categories, which is what the placeholder is as tall as.
      const typical = async (title: string, status: 'draft' | 'complete') => {
        const id = await insertSpell(sql, coven.id, title, 'workspace', A, status);
        await sql`update spells set intent = 'To keep the house and everyone under its roof safe through the winter.' where id = ${id}`;
        await sql`
          insert into spell_categories (spell_id, category_id, created_by, updated_by)
          select ${id}, id, ${A}, ${A}
          from categories where deleted_at is null order by name limit 3`;
        return id;
      };
      const spell = await typical(SPELL_TITLE, 'complete');
      spellId = spell;
      for (let position = 0; position < 3; position += 1) {
        await insertStep(sql, spell, held, { quantity: 2, unit: 'g', position }, A);
      }
      for (let n = 0; n < 3; n += 1) {
        await typical(`Layoutwort ${n}`, 'complete');
        await typical(`Draftwort ${n}`, 'draft');
      }
      // The switcher offers Create Coven only to a holder of the right.
      await sql.begin(async (tx) => {
        await tx`select set_config('app.privilege_route', 'manual', true)`;
        await tx`update users set can_create_workspace = true where id = ${A}`;
      });
      await sql`
        insert into invitations (workspace_id, email, role, token_hash, expires_at, created_by, updated_by)
        values (${coven.id}, 'invited@skeleton-layout.test', 'member', 'layout-hash-1', now() + interval '7 days', ${A}, ${A})`;
      await sql`
        insert into invitations (email, site_role, token_hash, expires_at, created_by, updated_by)
        values ('keeper-invited@skeleton-layout.test', 'admin', 'layout-hash-2', now() + interval '7 days', ${keeperId}, ${keeperId})`;
      await sql`
        insert into invitations (kind, batch_id, position, token_hash, expires_at, accepted_at, accepted_by, created_by, updated_by)
        values ('card', pg_catalog.gen_random_uuid(), 1, 'layout-hash-3', now() + interval '7 days', now(), ${coven.users.B}, ${keeperId}, ${keeperId})`;
      const [card] = await sql`select id from invitations where token_hash = 'layout-hash-3'`;
      await sql`
        insert into card_invitation_attempts (invitation_id, user_id, reason, created_by, updated_by)
        values (${card.id}, ${coven.users.B}, 'accepted', ${keeperId}, ${keeperId})`;
      await sql`
        insert into user_privilege_changes (user_id, privilege, change, via, created_by, updated_by)
        values (${A}, 'create_workspace', 'grant', 'admin', ${keeperId}, ${keeperId})`;
      await sql`
        insert into support_requests (about, subject, message, path, created_by, updated_by)
        values ('bug', 'Fixture request', 'A fixture message.', '/compendium', ${A}, ${A})`;
    });
  } finally {
    await setup.close();
  }
  for (const [as, userId] of [
    ['steward', coven.users.A],
    ['keeper', keeperId],
  ] as const) {
    const context = await browser.newContext();
    await signInAgainAs(await context.newPage(), userId);
    sessions[as] = await context.storageState();
    await context.close();
  }
});

interface Navigation {
  /** The route's name, which `--grep` selects it by. */
  name: string;
  /** The coven steward, or the site keeper. */
  as: 'steward' | 'keeper';
  /** The page the link is clicked on. */
  from: (slug: string) => string;
  /** The link's address, matched on its path, or the coven switcher's Create Coven. */
  to: (slug: string) => string | RegExp | 'switcher';
  /** The title is content (an entry's or a spell's name), so only its position is compared. */
  dynamicTitle?: boolean;
  /** Parts that stack under content that varies by item at phone width: only x and width are compared. */
  stackedParts?: string[];
  /** The account menu draws its links only once opened, so it is opened before the link is looked for. */
  inAccountMenu?: boolean;
  /** Static parts of this page alone, by name: the first shown match of each selector, and the dimensions compared. */
  parts?: Record<string, { selector: string; dimensions: Dimension[] }>;
}

// A move between two tabs of one admin page is not listed: the tab row stays mounted and swaps its own panel skeleton, so no cover is drawn (skeletonFor).
const navigations: Navigation[] = [
  { name: 'compendium', as: 'steward', from: () => '/account', to: () => '/compendium' },
  {
    name: 'compendium-entry',
    as: 'steward',
    from: () => '/compendium',
    to: () => /^\/compendium\/ingredients\/[^/]+$/,
    dynamicTitle: true,
  },
  { name: 'terms', as: 'steward', from: () => '/compendium', to: () => '/terms' },
  { name: 'privacy', as: 'steward', from: () => '/compendium', to: () => '/privacy' },
  { name: 'code-of-ethics', as: 'steward', from: () => '/compendium', to: () => '/code-of-ethics' },
  { name: 'disclaimer', as: 'steward', from: () => '/compendium', to: () => '/disclaimer' },
  {
    name: 'account',
    as: 'steward',
    from: () => '/compendium',
    to: () => '/account',
    inAccountMenu: true,
  },
  { name: 'account-sign-in', as: 'steward', from: () => '/account', to: () => '/account/sign-in' },
  { name: 'account-support', as: 'steward', from: () => '/account', to: () => '/account/support' },
  {
    name: 'coven-new-switch',
    as: 'steward',
    from: (slug) => `/coven/${slug}`,
    to: () => 'switcher',
  },
  {
    name: 'coven-home-from-main',
    as: 'steward',
    from: () => '/compendium',
    to: (slug) => `/coven/${slug}`,
    dynamicTitle: true,
  },
  {
    name: 'coven-home',
    as: 'steward',
    from: (slug) => `/coven/${slug}/grimoire`,
    to: (slug) => `/coven/${slug}`,
    dynamicTitle: true,
  },
  {
    name: 'coven-members',
    as: 'steward',
    from: (slug) => `/coven/${slug}`,
    to: (slug) => `/coven/${slug}/members`,
  },
  {
    name: 'coven-invitations',
    as: 'steward',
    from: (slug) => `/coven/${slug}/members`,
    to: (slug) => `/coven/${slug}/invitations`,
  },
  {
    name: 'coven-grimoire',
    as: 'steward',
    from: (slug) => `/coven/${slug}`,
    to: (slug) => `/coven/${slug}/grimoire`,
  },
  {
    name: 'coven-grimoire-drafts',
    as: 'steward',
    from: (slug) => `/coven/${slug}/grimoire`,
    to: (slug) => `/coven/${slug}/grimoire/drafts`,
  },
  {
    name: 'coven-spell',
    as: 'steward',
    from: (slug) => `/coven/${slug}/grimoire`,
    // The Charm, whose steps match the Steps entry the skeleton's menu draws.
    to: (slug) => `/coven/${slug}/grimoire/${spellId}`,
    dynamicTitle: true,
    stackedParts: ['aside'],
    // The back link, the last-edit line, the menu (its entries are fixed) and the headings of the side
    // column and Workings, whose words are fixed; where the headings stand depends on the steps above them.
    parts: {
      backLink: { selector: '.spell-recipe__bar .back-link', dimensions: ['x', 'y', 'w', 'h'] },
      lastEdit: { selector: '.last-edit', dimensions: ['x', 'y', 'h'] },
      menu: { selector: 'nav.page-nav', dimensions: ['h'] },
      categoryMatch: { selector: '.comparison-panel h2', dimensions: ['x', 'w', 'h'] },
      cupboard: { selector: '.spell-inventory h2', dimensions: ['x', 'w', 'h'] },
      workings: { selector: '.spell-workings h2', dimensions: ['x', 'w', 'h'] },
    },
  },
  {
    name: 'coven-ingredients',
    as: 'steward',
    from: (slug) => `/coven/${slug}`,
    to: (slug) => `/coven/${slug}/ingredients`,
  },
  {
    name: 'coven-entry',
    as: 'steward',
    from: (slug) => `/coven/${slug}/ingredients`,
    to: (slug) => new RegExp(`^/coven/${slug}/ingredients/[^/]+$`),
    dynamicTitle: true,
    stackedParts: ['list', 'item'],
  },
  { name: 'curator', as: 'keeper', from: () => '/keepers', to: () => '/curator' },
  {
    name: 'curator-compendium',
    as: 'keeper',
    from: () => '/curator',
    to: () => '/curator/compendium',
  },
  {
    name: 'curator-categories',
    as: 'keeper',
    from: () => '/curator',
    to: () => '/curator/categories',
  },
  { name: 'curator-forms', as: 'keeper', from: () => '/curator', to: () => '/curator/forms' },
  { name: 'curator-deities', as: 'keeper', from: () => '/curator', to: () => '/curator/deities' },
  {
    name: 'curator-celestial-bodies',
    as: 'keeper',
    from: () => '/curator',
    to: () => '/curator/celestial-bodies',
  },
  { name: 'keepers', as: 'keeper', from: () => '/curator', to: () => '/keepers' },
  { name: 'keepers-users', as: 'keeper', from: () => '/keepers', to: () => '/keepers/users' },
  {
    name: 'keepers-invitations',
    as: 'keeper',
    from: () => '/keepers',
    to: () => '/keepers/invitations',
  },
  { name: 'keepers-support', as: 'keeper', from: () => '/keepers', to: () => '/keepers/support' },
  {
    name: 'keepers-business-cards',
    as: 'keeper',
    from: () => '/keepers',
    to: () => '/keepers/business-cards',
  },
  { name: 'keepers-help', as: 'keeper', from: () => '/keepers', to: () => '/keepers/help' },
  {
    name: 'help',
    as: 'steward',
    from: () => '/compendium',
    to: () => '/help',
    inAccountMenu: true,
  },
];

type Box = { x: number; y: number; w: number; h: number };
type Dimension = keyof Box;

/** Every static part found, by name, in the skeleton or on the page, with the table's headings. */
interface Layout {
  parts: Record<string, Box | null>;
  headings: string | null;
  /** The first list item is a card or a stacked row, whose height is static; a table row's wraps. */
  itemIsCard: boolean;
  /** The box the table scrolls sideways in, and whether its rows overrun it; cell contents set a nowrap row's width. */
  tableFrame: Box | null;
  tableScrolls: boolean;
}

/** The site bar and the context row, which stay on screen across the navigation. */
const frameOf = (page: Page) =>
  page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    };
    return { bar: box('.app-shell__bar'), contextRow: box('.context-row') };
  });

/** The static parts inside the skeleton's cover, or on the arrived page. */
const layoutOf = (page: Page, inSkeleton: boolean, extra: Navigation['parts'] = {}) =>
  page.evaluate(
    ({ skeleton, extra }): Layout => {
      const root = skeleton ? document.querySelector('.skeleton-cover') : document;
      const outside =
        '.skeleton-cover, .skeleton-fade, .skeleton-held, .app-shell__bar, .context-row, .site-footer, dialog';
      const shown = (element: Element) => {
        if (!skeleton && element.closest(outside)) return false;
        if (skeleton && element.closest('dialog')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const find = (selector: string) =>
        [...(root?.querySelectorAll(selector) ?? [])].find(shown) ?? null;
      const box = (element: Element | null) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      };
      // A document's body is published text, so a table or list inside it sits wherever the text puts it.
      const listed = (element: Element) =>
        shown(element) && !element.closest('.document-page__body');
      const table = [...(root?.querySelectorAll('table') ?? [])].find(listed) ?? null;
      const list =
        table ??
        [
          ...(root?.querySelectorAll('ul[aria-label], ol[aria-label], [role="list"][aria-label]') ??
            []),
        ].find((element) => listed(element) && !element.closest('nav, header, form')) ??
        null;
      const item = table ? table.querySelector('tbody tr') : (list?.firstElementChild ?? null);
      let frame = table?.parentElement ?? null;
      while (frame && !['auto', 'scroll'].includes(getComputedStyle(frame).overflowX)) {
        frame = frame.parentElement;
      }
      const stacked =
        !!table && getComputedStyle(table.querySelector('thead') ?? table).display === 'none';
      return {
        parts: {
          h1: box(find('h1')),
          header: box(find('.page-header')),
          action: box(
            find(
              '.page-header > :not(h1, h2, .page-header__title, .tabbed-page__tabs, .tabbed-page__action), .tabbed-page__action > *',
            ),
          ),
          eyebrow: box(find('.eyebrow')),
          lede: box(find('.lede')),
          tabs: box(find('.tabbed-page__tabs')),
          pageNav: box(find('nav.page-nav')),
          filter: box(find('.filter-row')),
          aside: box(find('aside')),
          toolbar: box(find('[role="toolbar"]')),
          list: box(list),
          item: item && shown(item) ? box(item) : null,
          ...Object.fromEntries(
            Object.entries(extra).map(([name, { selector }]) => [name, box(find(selector))]),
          ),
        },
        headings: table
          ? [...table.querySelectorAll('thead th')]
              .map((th) => {
                // A sort button's spoken state is not part of the heading the eye reads.
                const copy = th.cloneNode(true) as HTMLElement;
                copy
                  .querySelectorAll('.visually-hidden')
                  .forEach((hidden) => hidden.textContent?.startsWith(',') && hidden.remove());
                return copy.textContent?.trim();
              })
              .join('|')
          : null,
        itemIsCard: !table || stacked,
        tableFrame: box(frame),
        tableScrolls: !!frame && frame.scrollWidth > frame.clientWidth + 1,
      };
    },
    { skeleton: inSkeleton, extra },
  );

/** Which dimensions of each part are static: a dynamic title fixes only where the heading starts. */
function staticDimensions(
  part: string,
  navigation: Navigation,
  layout: Layout,
  phone: boolean,
): Dimension[] {
  if (phone && navigation.stackedParts?.includes(part)) return ['x', 'w'];
  const own = navigation.parts?.[part];
  if (own) return own.dimensions;
  switch (part) {
    case 'h1':
      return navigation.dynamicTitle ? ['x', 'y'] : ['x', 'y', 'h'];
    case 'header':
      return navigation.dynamicTitle ? ['x', 'y', 'w'] : ['x', 'y', 'w', 'h'];
    case 'eyebrow':
      return ['x', 'y'];
    case 'lede':
    case 'pageNav':
    case 'aside':
    case 'list':
      return ['x', 'y', 'w'];
    case 'item':
      if (layout.tableScrolls) return ['x', 'y'];
      return layout.itemIsCard ? ['x', 'y', 'w', 'h'] : ['x', 'y', 'w'];
    default:
      return ['x', 'y', 'w', 'h'];
  }
}

/** Every static difference past the tolerance, worded with both values and the gap. */
function differences(
  navigation: Navigation,
  skeleton: Layout,
  arrived: Layout,
  phone: boolean,
): string[] {
  const found: string[] = [];
  for (const part of Object.keys(arrived.parts)) {
    // A table wider than its frame scrolls inside it, so the frame is the static part, not the table.
    const framed = part === 'list' && arrived.tableScrolls;
    const want = framed ? arrived.tableFrame : arrived.parts[part];
    const got = framed ? (skeleton.tableFrame ?? skeleton.parts[part]) : skeleton.parts[part];
    // A list with nothing in it is content: an empty page shows no rows for the skeleton's to match.
    if ((part === 'item' || part === 'list') && !want) continue;
    if (want && !got) {
      found.push(`${part}: on the page, missing from the skeleton`);
      continue;
    }
    if (got && !want) {
      found.push(`${part}: in the skeleton, not on the page`);
      continue;
    }
    if (!want || !got) continue;
    for (const dimension of staticDimensions(part, navigation, arrived, phone)) {
      const gap = Math.round(Math.abs(got[dimension] - want[dimension]));
      if (gap > TOLERANCE) {
        found.push(
          `${part}.${dimension}: skeleton ${Math.round(got[dimension])}, page ${Math.round(want[dimension])} (${gap}px)`,
        );
      }
    }
  }
  if (arrived.headings !== null && arrived.parts.item && skeleton.headings !== arrived.headings) {
    found.push(`headings: skeleton [${skeleton.headings}], page [${arrived.headings}]`);
  }
  return found;
}

/** An element's box and the border sides it draws, or whether a list item draws a marker. */
interface Drawn {
  x: number;
  y: number;
  w: number;
  sides: string[];
  marker: boolean;
}

/** Every visible element in the skeleton's cover, or on the arrived page, with its drawn border sides and marker. */
const decorationsOf = (page: Page, inSkeleton: boolean) =>
  page.evaluate((skeleton): Drawn[] => {
    const root = skeleton ? document.querySelector('.skeleton-cover') : document.body;
    const outside =
      '.skeleton-cover, .skeleton-fade, .skeleton-held, .app-shell__bar, .context-row, .site-footer, dialog';
    const frame = '.app-shell__bar, .context-row, .site-footer, dialog';
    const visible = (color: string) => !/^transparent$|rgba\(.*,\s*0\)$/.test(color);
    const found: Drawn[] = [];
    for (const element of root?.querySelectorAll('*') ?? []) {
      // The site bar and the context row are the frame, which frameMoves compares, in the cover or out of it.
      if (element.closest(skeleton ? frame : outside)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(element);
      const sides = ['top', 'right', 'bottom', 'left'].filter(
        (side) =>
          parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
          !['none', 'hidden'].includes(style.getPropertyValue(`border-${side}-style`)) &&
          visible(style.getPropertyValue(`border-${side}-color`)),
      );
      let marker = false;
      if (element.tagName === 'LI') {
        const before = getComputedStyle(element, '::before');
        marker =
          (style.display === 'list-item' && style.listStyleType !== 'none') ||
          (!['none', 'normal'].includes(before.content) &&
            before.display !== 'none' &&
            (before.content !== '""' || visible(before.backgroundColor)));
      }
      found.push({ x: rect.x, y: rect.y, w: rect.width, sides, marker });
    }
    return found;
  }, inSkeleton);

/**
 * What the skeleton draws that the page does not, judged against the page's element in the same place: a list
 * marker where the page's item has none, and a border side the page's element lacks. A skeleton element with
 * no page element in its place stands for content, and only its marker is judged.
 */
function strayDecorations(skeleton: Drawn[], arrived: Drawn[]): string[] {
  const found: string[] = [];
  const near = (a: Drawn, b: Drawn) =>
    Math.abs(a.x - b.x) <= TOLERANCE &&
    Math.abs(a.y - b.y) <= TOLERANCE &&
    Math.abs(a.w - b.w) <= TOLERANCE;
  const at = (part: Drawn) => `${Math.round(part.x)},${Math.round(part.y)} ${Math.round(part.w)}px`;
  for (const part of skeleton) {
    const matches = arrived.filter((other) => near(part, other));
    if (part.marker && !matches.some((other) => other.marker)) {
      found.push(`list marker at ${at(part)}: in the skeleton, not on the page`);
    }
    if (matches.length === 0) continue;
    for (const side of part.sides) {
      if (!matches.some((other) => other.sides.includes(side))) {
        found.push(`border-${side} at ${at(part)}: in the skeleton, not on the page`);
      }
    }
  }
  return found;
}

/** Every move of the site bar or the context row past the tolerance between two moments. */
function frameMoves(
  label: string,
  before: Awaited<ReturnType<typeof frameOf>>,
  after: Awaited<ReturnType<typeof frameOf>>,
): string[] {
  const found: string[] = [];
  for (const part of ['bar', 'contextRow'] as const) {
    const was = before[part];
    const now = after[part];
    if (!was || !now) continue;
    for (const dimension of ['x', 'y', 'w', 'h'] as const) {
      const gap = Math.round(Math.abs(now[dimension] - was[dimension]));
      if (gap > TOLERANCE) {
        found.push(
          `${label} ${part}.${dimension}: ${Math.round(was[dimension])} then ${Math.round(now[dimension])} (${gap}px)`,
        );
      }
    }
  }
  return found;
}

/** Marks the link to `to` on the current page, preferring one on screen, and says whether it is. */
const markLink = (page: Page, to: string | RegExp) =>
  page.evaluate(
    ({ exact, pattern }) => {
      const matches = (anchor: Element) => {
        const path = (anchor.getAttribute('href') ?? '').split(/[?#]/)[0];
        return pattern ? new RegExp(pattern).test(path) : path === exact;
      };
      for (const marked of document.querySelectorAll('[data-skeleton-layout-link]')) {
        marked.removeAttribute('data-skeleton-layout-link');
      }
      const anchors = [...document.querySelectorAll('a[href]')].filter(matches);
      const onScreen = anchors.find(
        (anchor) =>
          anchor.checkVisibility({ visibilityProperty: true, opacityProperty: true }) &&
          anchor.getBoundingClientRect().width > 0,
      );
      const pick = onScreen ?? anchors[0];
      if (!pick) return null;
      pick.setAttribute('data-skeleton-layout-link', '');
      return { onScreen: !!onScreen };
    },
    typeof to === 'string' ? { exact: to, pattern: null } : { exact: null, pattern: to.source },
  );

// A page is run at the phone width as well only where its parts stack there (stackedParts); the others lay out alike at both.
for (const as of ['steward', 'keeper'] as const) {
  test.describe(`as the ${as}`, () => {
    for (const navigation of navigations.filter((each) => each.as === as)) {
      for (const width of navigation.stackedParts
        ? [DESKTOP_WIDTH, PHONE_WIDTH]
        : [DESKTOP_WIDTH]) {
        test(`${navigation.name} at ${width}px: the skeleton's static parts stand where the page's do`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: width === PHONE_WIDTH ? 812 : 900 });
          const session = sessions[as];
          if (!session) throw new Error(`no session was built for the ${as}`);
          await page.context().addCookies(session.cookies);
          const server = await holdServerAnswers(page);
          await page.goto(navigation.from(coven.slug));
          await expect(page.locator('h1').first()).toBeVisible();

          const to = navigation.to(coven.slug);
          let link: { onScreen: boolean } | null = null;
          if (to === 'switcher') {
            await hydrated(page, '[role="combobox"]');
            await page.getByRole('combobox', { name: 'Coven' }).first().click();
          } else {
            if (navigation.inAccountMenu) {
              await hydrated(page, '.account-menu__button');
              await page.locator('.account-menu__button').click();
            }
            // Why the comparison means something: the old page carries a real link to the destination.
            await expect
              .poll(() => markLink(page, to), {
                message: `a link to ${String(to)} on ${navigation.from(coven.slug)}`,
              })
              .not.toBeNull();
            link = await markLink(page, to);
            await hydrated(page, '[data-skeleton-layout-link]');
          }
          // Read at the top of the old page, as the skeleton scrolls to the top when it shows.
          expect(await page.evaluate(() => window.scrollY)).toBe(0);
          const frameBefore = await frameOf(page);
          if (link?.onScreen) {
            await page.locator('[data-skeleton-layout-link]').scrollIntoViewIfNeeded();
          }

          server.hold();
          if (to === 'switcher') {
            await page.getByRole('option', { name: 'Create Coven', exact: true }).click();
          } else if (link?.onScreen) {
            await page.locator('[data-skeleton-layout-link]').click();
          } else {
            // A link in a closed menu (the phone's More) is followed as a tap on it would follow it.
            await page.locator('[data-skeleton-layout-link]').evaluate((anchor) => {
              (anchor as HTMLAnchorElement).click();
            });
          }
          await expect.poll(server.held).toBeGreaterThan(0);
          await expect(page.locator('.skeleton-cover')).toHaveCount(1);
          // Two frames, so the skeleton is laid out and painted before it is measured.
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
          );
          const frameWaiting = await frameOf(page);
          const skeleton = await layoutOf(page, true, navigation.parts);
          const skeletonDrawn = await decorationsOf(page, true);

          await server.release();
          await expect(page.locator('.skeleton-cover')).toHaveCount(0, { timeout: 20_000 });
          await expect(page.locator('.skeleton-fade')).toHaveCount(0);
          // A part still loading its code or data says so with aria-busy, and is measured once it is drawn.
          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
          const frameArrived = await frameOf(page);
          await expect(page.locator('h1').first()).toBeVisible();
          const arrived = await layoutOf(page, false, navigation.parts);
          const arrivedDrawn = await decorationsOf(page, false);
          // Why the comparison means something: the page arrived and drew its heading.
          expect(arrived.parts.h1, 'the arrived page has a heading').not.toBeNull();

          const found = [
            ...frameMoves('old page to skeleton:', frameBefore, frameWaiting),
            ...frameMoves('skeleton to page:', frameWaiting, frameArrived),
            ...differences(navigation, skeleton, arrived, width === PHONE_WIDTH),
            ...strayDecorations(skeletonDrawn, arrivedDrawn),
          ];
          expect(found, found.join('\n')).toEqual([]);
        });
      }
    }
  });
}

/** The Edit Spell dialog's parts, by name: its box, the header's control row, each section, the Shared switch and the actions. */
const dialogLayoutOf = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    const box = (element: Element | null | undefined) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    };
    const parts: Record<string, Box | null> = {
      dialog: box(dialog),
      controls: box(dialog?.querySelector('.modal-dialog__header-slot')),
      share: box(dialog?.querySelector('.spell-builder__share')),
      actions: box(dialog?.querySelector('.form__actions')),
    };
    dialog?.querySelectorAll('.collapsible-section').forEach((section, at) => {
      parts[`section ${at + 1}`] = box(section);
    });
    return parts;
  });

// The Edit Spell dialog opens at once over a skeleton of its form: the header's Open All and Undo and Redo,
// the four shut sections, the Shared switch and the actions stand where the form puts them.
test('the Edit Spell dialog at the desktop and phone widths: its skeleton stands where the form does', async ({
  page,
}) => {
  const session = sessions.steward;
  if (!session) throw new Error('no session was built for the steward');
  await page.context().addCookies(session.cookies);
  const server = await holdServerAnswers(page);
  for (const width of [DESKTOP_WIDTH, PHONE_WIDTH]) {
    await page.setViewportSize({ width, height: width === PHONE_WIDTH ? 812 : 900 });
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const edit = page.getByRole('link', { name: `Edit ${SPELL_TITLE}` });
    await expect(edit).toBeVisible();
    await hydrated(page, `a[href$="?edit=${spellId}"]`);

    server.hold();
    await edit.click();
    await expect.poll(server.held).toBeGreaterThan(0);
    await expect(page.locator('dialog[open] .modal-dialog__body[aria-busy="true"]')).toHaveCount(1);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    const skeleton = await dialogLayoutOf(page);

    await server.release();
    await expect(page.locator('dialog[open] [aria-busy="true"]')).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: 'Save Spell' })).toBeVisible();
    const arrived = await dialogLayoutOf(page);
    // Why the comparison means something: the form arrived with its four sections.
    expect(Object.keys(arrived).filter((name) => name.startsWith('section'))).toHaveLength(4);

    const found: string[] = [];
    for (const [name, want] of Object.entries(arrived)) {
      const got = skeleton[name];
      if (want && !got) found.push(`${width}px ${name}: on the form, missing from the skeleton`);
      if (!want || !got) continue;
      for (const dimension of ['x', 'y', 'w', 'h'] as const) {
        const gap = Math.round(Math.abs(got[dimension] - want[dimension]));
        if (gap > TOLERANCE) {
          found.push(
            `${width}px ${name}.${dimension}: skeleton ${Math.round(got[dimension])}, form ${Math.round(want[dimension])} (${gap}px)`,
          );
        }
      }
    }
    expect(found, found.join('\n')).toEqual([]);
  }
});
