import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { GET as aiCatalog } from '@/app/.well-known/ai-catalog.json/route';
import { GET as ard } from '@/app/.well-known/ard.json/route';
import { GET as llms } from '@/app/llms.txt/route';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { PUBLIC_DOCUMENTS } from '@/lib/public-documents';
import { SITE_ORIGIN, siteUrl } from '@/lib/site';
import { listHelpArticleLinks } from '@/modules/help';
import { A, E } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// Llms.txt lists the public compendium, documents and help, and the catalog the compendium alone, and neither names
// anything a coven owns or a reader cannot open, over the real cached reads with no session.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate help_articles cascade`;
  clearDataCache();
});

const seed = (name: string, workspaceId: string | null = null) =>
  insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', workspaceId }), A.id);

async function seedWorld() {
  const removed = await seed('Fixture Removed');
  await seed('Fixture Coven Own', WORKSPACE_W_ID);
  await seed('Fixture Kept');
  await sql`update ingredients set deleted_at = now() where id = ${removed}`;
  const rows = await sql<
    { name: string; slug: string; deleted_at: Date | null; workspace_id: string | null }[]
  >`
    select name, slug, deleted_at, workspace_id from ingredients`;
  const [coven] = await sql<{ name: string; slug: string }[]>`
    select name, slug from workspaces where id = ${WORKSPACE_W_ID}`;
  return { rows, coven };
}

const bodies = async () => [
  await (await llms()).text(),
  await (await aiCatalog()).text(),
  await (await ard()).text(),
];

describe('what the public files list', () => {
  // What the read lists, its description included, is compendium-slugs.test.ts's,
  // and how a link is written is tests/app/ai-discovery.test.ts's: this holds
  // that the files list only what the public read answers.
  it('lists the live compendium entry and names no removed entry, coven, coven ingredient, admin or API path', async () => {
    const { rows, coven } = await seedWorld();
    const bySlug = (name: string) => rows.find((row) => row.name === name)!;
    // Both unwanted rows exist, one soft-deleted and one in a workspace.
    expect(bySlug('Fixture Removed').deleted_at).not.toBeNull();
    expect(bySlug('Fixture Coven Own').workspace_id).toBe(WORKSPACE_W_ID);
    expect(coven.name.length).toBeGreaterThan(0);

    expect(await (await llms()).text()).toContain(
      `${SITE_ORIGIN}/compendium/ingredients/${bySlug('Fixture Kept').slug})`,
    );
    for (const body of await bodies()) {
      expect(body).not.toContain(bySlug('Fixture Removed').slug);
      expect(body).not.toContain(bySlug('Fixture Coven Own').slug);
      expect(body).not.toContain('Fixture Coven Own');
      expect(body).not.toContain('/coven');
      expect(body).not.toContain('/keepers');
      expect(body).not.toContain('/curator');
      expect(body).not.toContain(coven.name);
      expect(body).not.toContain(coven.slug);
    }
    // Every catalog URL is the public site's compendium.
    for (const body of (await bodies()).slice(1)) {
      const urls = body.match(URL_IN_TEXT) ?? [];
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).toMatch(new RegExp(`^${SITE_ORIGIN}/compendium(/ingredients/[^/]+)?$`));
      }
    }
    // Every llms.txt URL is the public site's compendium, a document, the help, or the sitemap.
    const documents = new Set(PUBLIC_DOCUMENTS.map((document) => siteUrl(document.path)));
    for (const url of (await (await llms()).text()).match(URL_IN_TEXT) ?? []) {
      expect(
        documents.has(url) ||
          new RegExp(
            `^${SITE_ORIGIN}/(compendium(/ingredients/[^/]+)?|help(/[^/]+){0,2}|sitemap\\.xml)$`,
          ).test(url),
      ).toBe(true);
    }
  });
});

const URL_IN_TEXT = /https?:\/\/[^\s)"\\]+/g;

describe('the help llms.txt lists', () => {
  // How a help row is admitted to a reader is help-reads.test.ts's; this holds that llms.txt lists what the public
  // help read answers, and the catalog none of it.
  async function seedHelp() {
    const guide = await insertHelpArticle(
      sql,
      {
        kind: 'guide',
        title: 'Testwort Kept Guide',
        slug: 'testwort-kept-guide',
        summary: 'How a fixture guide reads.',
        position: 1,
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Kept Step', slug: 'testwort-kept-step', parent_id: guide },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Step', slug: 'testwort-shy-step', parent_id: guide, shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Article', slug: 'testwort-shy-article', shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Gone Article', slug: 'testwort-gone-article', deleted_at: new Date() },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Staff Article', slug: 'testwort-staff-article', audience: 'staff' },
      E.id,
    );
    return sql<{ slug: string; shown: boolean; deleted_at: Date | null; audience: string }[]>`
      select slug, shown, deleted_at, audience from help_articles`;
  }
  const UNLISTED = [
    ['testwort-shy-step', 'Testwort Shy Step'],
    ['testwort-shy-article', 'Testwort Shy Article'],
    ['testwort-gone-article', 'Testwort Gone Article'],
    ['testwort-staff-article', 'Testwort Staff Article'],
  ];

  it('reads each shown public article and sub page with its title and summary, and no hidden, deleted or staff row', async () => {
    const rows = await seedHelp();
    const row = (slug: string) => rows.find((one) => one.slug === slug)!;
    // Each unwanted row exists, for the reason it is left out.
    expect(row('testwort-shy-step').shown).toBe(false);
    expect(row('testwort-shy-article').shown).toBe(false);
    expect(row('testwort-gone-article').deleted_at).not.toBeNull();
    expect(row('testwort-staff-article').audience).toBe('staff');

    const links = await listHelpArticleLinks();

    expect([...links].sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        path: '/help/testwort-kept-guide',
        title: 'Testwort Kept Guide',
        summary: 'How a fixture guide reads.',
      },
      {
        path: '/help/testwort-kept-guide/testwort-kept-step',
        title: 'Testwort Kept Step',
        summary: null,
      },
    ]);
  });

  it('puts the shown public help in llms.txt, and no hidden, deleted or staff row in any of the files', async () => {
    await seedHelp();

    const text = await (await llms()).text();

    expect(text).toContain(`[Testwort Kept Guide](${SITE_ORIGIN}/help/testwort-kept-guide)`);
    expect(text).toContain(
      `[Testwort Kept Step](${SITE_ORIGIN}/help/testwort-kept-guide/testwort-kept-step)`,
    );
    for (const body of await bodies()) {
      for (const [slug, title] of UNLISTED) {
        expect(body).not.toContain(slug);
        expect(body).not.toContain(title);
      }
      expect(body).not.toContain('/help/staff');
    }
    for (const body of (await bodies()).slice(1)) expect(body).not.toContain('/help');
  });
});
