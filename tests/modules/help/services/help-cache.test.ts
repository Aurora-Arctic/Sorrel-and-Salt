import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { revalidateTag } from 'next/cache';
import { COMPENDIUM_TAG } from '@/lib/compendium-cache';
import { DOCUMENTS_TAG } from '@/lib/documents-cache';
import type { PageRequest } from '@/lib/types';
import {
  createHelpArticle,
  deleteHelpArticle,
  orderHelpFaq,
  readHelpArticle,
  readHelpFaq,
  readStaffHelpArticle,
  searchHelp,
  setHelpArticleShown,
  updateHelpArticle,
} from '@/modules/help';
import { E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';
import { clearDataCache, declared } from '../../../support/next-data-cache';

// The data cache holds as Next's does (tests/support/next-data-cache.ts), so a row changed underneath a read shows whether the repeat read reached Postgres.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

const HELP_TAG = 'help';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 26, inverted: false };

let faqId: string;

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
  clearDataCache();
  vi.mocked(revalidateTag).mockClear();
  faqId = await insertHelpArticle(
    sql,
    { kind: 'faq', title: 'Testwort First Question', slug: 'testwort-first-question', position: 1 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Guide', slug: 'testwort-guide', position: 1 },
    E.id,
  );
});

const faqTitles = async () => (await readHelpFaq(PAGE)).map((entry) => entry.node.title);

const renameUnderneath = (id: string, title: string) =>
  sql`update help_articles set title = ${title} where id = ${id}`;

describe('the public help reads are cached under the help tag', () => {
  it('declares every help read under the help tag alone', async () => {
    await readHelpFaq(PAGE);

    const help = declared.filter((declaration) => declaration.tags.includes(HELP_TAG));
    // Precondition: the help reads were declared at all.
    expect(help.length).toBeGreaterThan(0);
    expect(help.every((declaration) => declaration.tags.length === 1)).toBe(true);
    expect(HELP_TAG).not.toBe(COMPENDIUM_TAG);
    expect(HELP_TAG).not.toBe(DOCUMENTS_TAG);
  });

  it('answers a repeat read from the cache, and Postgres again once the tag expires', async () => {
    expect(await faqTitles()).toEqual(['Testwort First Question']);
    expect((await readHelpArticle('testwort-guide')).title).toBe('Testwort Guide');

    await renameUnderneath(faqId, 'Testwort Renamed Question');
    await sql`update help_articles set title = 'Testwort Renamed Guide' where slug = 'testwort-guide'`;

    expect(await faqTitles()).toEqual(['Testwort First Question']);
    expect((await readHelpArticle('testwort-guide')).title).toBe('Testwort Guide');

    revalidateTag(HELP_TAG, { expire: 0 });

    expect(await faqTitles()).toEqual(['Testwort Renamed Question']);
    expect((await readHelpArticle('testwort-guide')).title).toBe('Testwort Renamed Guide');
  });

  // Each tag is emptied for its own writes alone.
  it('keeps the help reads cached when the compendium or documents tag expires', async () => {
    await faqTitles();
    await renameUnderneath(faqId, 'Testwort Renamed Question');

    revalidateTag(COMPENDIUM_TAG, { expire: 0 });
    revalidateTag(DOCUMENTS_TAG, { expire: 0 });

    expect(await faqTitles()).toEqual(['Testwort First Question']);
  });
});

describe('every help write expires the help tag', () => {
  it('shows a reader a created FAQ entry', async () => {
    expect(await faqTitles()).toEqual(['Testwort First Question']);

    await createHelpArticle(asUser(E), {
      kind: 'faq',
      title: 'Testwort Second Question',
      body: 'The fixture answer.',
      position: 2,
    });

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual(['Testwort First Question', 'Testwort Second Question']);
  });

  it('shows a reader an updated FAQ entry', async () => {
    expect(await faqTitles()).toEqual(['Testwort First Question']);

    await updateHelpArticle(asUser(E), faqId, { title: 'Testwort Edited Question' });

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual(['Testwort Edited Question']);
  });

  it('shows a reader the FAQ in its new order', async () => {
    const secondId = await insertHelpArticle(
      sql,
      {
        kind: 'faq',
        title: 'Testwort Second Question',
        slug: 'testwort-second-question',
        position: 2,
      },
      E.id,
    );
    expect(await faqTitles()).toEqual(['Testwort First Question', 'Testwort Second Question']);

    await orderHelpFaq(asUser(E), [secondId, faqId]);

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual(['Testwort Second Question', 'Testwort First Question']);
  });

  it('shows a reader a deleted FAQ entry gone', async () => {
    expect(await faqTitles()).toEqual(['Testwort First Question']);

    await deleteHelpArticle(asUser(E), faqId);

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual([]);
  });
});

describe('the reads that turn on the reader are never cached', () => {
  it('reads the staff finder from Postgres every time', async () => {
    const staffId = await insertHelpArticle(
      sql,
      { title: 'Testwort Staff Notes', slug: 'testwort-staff-notes', audience: 'staff' },
      E.id,
    );
    expect((await readStaffHelpArticle(asUser(F), 'testwort-staff-notes')).title).toBe(
      'Testwort Staff Notes',
    );

    await renameUnderneath(staffId, 'Testwort Staff Notes Renamed');

    expect((await readStaffHelpArticle(asUser(F), 'testwort-staff-notes')).title).toBe(
      'Testwort Staff Notes Renamed',
    );
    expect(
      declared.filter((declaration) => declaration.keyParts.some((part) => /staff/i.test(part))),
    ).toEqual([]);
  });

  it('reads the search from Postgres every time', async () => {
    expect(await searchHelp(null, 'quillfeather', PAGE)).toEqual([]);

    await insertHelpArticle(
      sql,
      { title: 'Testwort Quillfeather', slug: 'testwort-quillfeather' },
      E.id,
    );

    expect((await searchHelp(null, 'quillfeather', PAGE)).map((entry) => entry.node.slug)).toEqual([
      'testwort-quillfeather',
    ]);
  });
});

describe('showing and hiding expires the help tag', () => {
  it('takes a hidden FAQ entry out of a reader’s cached list, and puts it back once shown', async () => {
    expect(await faqTitles()).toEqual(['Testwort First Question']);

    await setHelpArticleShown(asUser(E), faqId, false);

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual([]);

    vi.mocked(revalidateTag).mockClear();
    await setHelpArticleShown(asUser(E), faqId, true);

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect(await faqTitles()).toEqual(['Testwort First Question']);
  });

  it('expires the tag when a parent’s children change', async () => {
    const guideId = (await readHelpArticle('testwort-guide')).id;
    const pageId = await insertHelpArticle(sql, { title: 'Testwort Loose Page' }, E.id);
    expect((await readHelpArticle('testwort-guide')).children).toEqual([]);

    await updateHelpArticle(asUser(E), guideId, { childIds: [pageId] });

    expect(revalidateTag).toHaveBeenCalledWith(HELP_TAG, expect.anything());
    expect((await readHelpArticle('testwort-guide')).children.map((child) => child.id)).toEqual([
      pageId,
    ]);
  });
});
