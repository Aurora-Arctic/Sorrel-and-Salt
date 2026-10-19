import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { GET as aiCatalog } from '@/app/.well-known/ai-catalog.json/route';
import { GET as ard } from '@/app/.well-known/ard.json/route';
import { GET as llms } from '@/app/llms.txt/route';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { SITE_ORIGIN } from '@/lib/site';
import { A } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { clearDataCache } from '../../../support/next-data-cache';

// M12.2: llms.txt and the catalog list the public compendium and nothing a
// coven owns, over the real cached read with no session.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
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

describe('M12.2: what the public files list', () => {
  it('lists the live compendium entry, and leaves out a removed one and a coven ingredient', async () => {
    const { rows } = await seedWorld();
    const bySlug = (name: string) => rows.find((row) => row.name === name)!;
    // Both unwanted rows exist, one soft-deleted and one in a workspace.
    expect(bySlug('Fixture Removed').deleted_at).not.toBeNull();
    expect(bySlug('Fixture Coven Own').workspace_id).toBe(WORKSPACE_W_ID);

    const text = await (await llms()).text();
    const links = [...text.matchAll(/\]\((\S+?)\)/g)].map((match) => match[1]);

    expect(links).toContain(`${SITE_ORIGIN}/compendium`);
    expect(links).toContain(`${SITE_ORIGIN}/compendium/ingredients/${bySlug('Fixture Kept').slug}`);
    expect(links.filter((url) => url.includes('/ingredients/'))).toHaveLength(1);
    expect(text).not.toContain(bySlug('Fixture Removed').slug);
    expect(text).not.toContain(bySlug('Fixture Coven Own').slug);
    expect(text).not.toContain('Fixture Coven Own');
  });

  it("notes a link with the entry's stored description, and only that entry's", async () => {
    await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Described',
        nomenclature: 'none',
        description: 'A fixture herb.',
      }),
      A.id,
    );
    await seed('Fixture Bare');

    const lines = (await (await llms()).text()).split('\n');
    const line = (name: string) => lines.find((l) => l.startsWith(`- [${name}]`))!;

    expect(line('Fixture Described')).toMatch(/\): A fixture herb\.$/);
    expect(line('Fixture Bare')).toMatch(/\)$/);
  });

  it('names no coven, admin or API path, nor the coven, in any file', async () => {
    const { coven } = await seedWorld();
    expect(coven.name.length).toBeGreaterThan(0);

    for (const body of await bodies()) {
      expect(body).not.toContain('/coven');
      expect(body).not.toContain('/admin');
      expect(body).not.toContain(coven.name);
      expect(body).not.toContain(coven.slug);
      // Every URL is the public site's compendium, or the sitemap.
      const urls = body.match(/https?:\/\/[^\s)"\\]+/g) ?? [];
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).toMatch(
          new RegExp(`^${SITE_ORIGIN}/(compendium(/ingredients/[^/]+)?|sitemap\\.xml)$`),
        );
      }
    }
  });

  it('answers a repeat read from the cache, as the sitemap does', async () => {
    await seed('Fixture Kept');
    await llms();
    await seed('Fixture Later');

    expect(await (await llms()).text()).not.toContain('Fixture Later');
  });
});
