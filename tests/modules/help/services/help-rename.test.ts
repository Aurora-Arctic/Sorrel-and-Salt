import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import { HELP_QUICK_LINKS } from '@/lib/help-quick-links';
import { slugify } from '@/lib/slugify';
import { readHelpRenameEffects } from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// Nothing redirects an old help address, so before a save that moves one the editor asks what still points at it: the
// other rows' bodies and the front page's quick links (claude-docs/design-decisions/support.md, "Renaming a help row").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const NOWHERE = '00000000-0000-4000-8000-000000000000';

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

const titlesOf = (effects: { articles: { title: string }[] }) =>
  effects.articles.map((article) => article.title);

describe('readHelpRenameEffects', () => {
  let guideId: string;
  let subId: string;

  beforeEach(async () => {
    guideId = await insertHelpArticle(
      sql,
      { title: 'Testwort Guide', slug: 'testwort-guide', position: 1 },
      E.id,
    );
    subId = await insertHelpArticle(
      sql,
      {
        title: 'Testwort Sub Page',
        slug: 'testwort-sub-page',
        parent_id: guideId,
        position: 1,
      },
      E.id,
    );
  });

  it('names the old and the new address under the parent', async () => {
    const effects = await readHelpRenameEffects(asUser(E), subId, 'Testwort Renamed Page');

    expect(effects.oldPath).toBe('/help/testwort-guide/testwort-sub-page');
    expect(effects.newPath).toBe('/help/testwort-guide/testwort-renamed-page');
  });

  it('lists every other live row whose body links the old address, shown or hidden, and no longer slug', async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Linker', body: 'See [the page](/help/testwort-guide/testwort-sub-page).' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Hidden Linker',
        shown: false,
        audience: 'keeper',
        body: 'Read /help/testwort-guide/testwort-sub-page first.',
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Longer Slug',
        body: 'See /help/testwort-guide/testwort-sub-page-two instead.',
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Gone Linker',
        body: 'See /help/testwort-guide/testwort-sub-page.',
        deleted_at: new Date(),
      },
      E.id,
    );

    const effects = await readHelpRenameEffects(asUser(E), subId, 'Testwort Renamed Page');

    expect(titlesOf(effects)).toEqual(['Testwort Hidden Linker', 'Testwort Linker']);
  });

  it('leaves the row itself out though its own body links its address', async () => {
    await sql`update help_articles set body = 'This is /help/testwort-guide/testwort-sub-page.' where id = ${subId}`;

    const effects = await readHelpRenameEffects(asUser(E), subId, 'Testwort Renamed Page');

    expect(effects.articles).toEqual([]);
  });

  it('lists a body that marks a term by its old title, in any case, or by its slug', async () => {
    const termId = await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Bramble', slug: 'testwort-bramble' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort By Title', body: 'Gather the [[testwort bramble]] at dusk.' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort By Slug', body: 'Gather the [[Testwort-Bramble]] at dusk.' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Other Mark', body: 'Gather the [[Testwort Nettle]] at dusk.' },
      E.id,
    );

    const effects = await readHelpRenameEffects(asUser(E), termId, 'Testwort Briar');

    expect(effects.oldPath).toBe('/help/glossary#testwort-bramble');
    expect(titlesOf(effects)).toEqual(['Testwort By Slug', 'Testwort By Title']);
  });

  it('names the quick link that reads the old slug of a public top-level article', async () => {
    // Precondition: the quick links name at least one title to rename.
    const linked = HELP_QUICK_LINKS[0];
    expect(linked).toBeDefined();
    const id = await insertHelpArticle(sql, { title: linked, slug: slugify(linked) }, E.id);

    const effects = await readHelpRenameEffects(asUser(E), id, 'Testwort Renamed Guide');

    expect(effects.quickLinks).toEqual([linked]);
  });

  it('names no quick link for a row the front page does not link', async () => {
    const linked = HELP_QUICK_LINKS[0];
    const id = await insertHelpArticle(
      sql,
      { title: linked, slug: slugify(linked), audience: 'staff' },
      E.id,
    );

    const effects = await readHelpRenameEffects(asUser(E), id, 'Testwort Renamed Guide');

    expect(effects.quickLinks).toEqual([]);
  });

  it('answers nothing to ask when the title keeps the slug', async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Linker', body: 'See /help/testwort-guide/testwort-sub-page.' },
      E.id,
    );

    // Precondition: a slug-moving title would list the linker.
    expect(
      titlesOf(await readHelpRenameEffects(asUser(E), subId, 'Testwort Renamed Page')),
    ).toEqual(['Testwort Linker']);

    const effects = await readHelpRenameEffects(asUser(E), subId, 'TESTWORT  sub page!');
    expect(effects).toMatchObject({ articles: [], quickLinks: [] });
    expect(effects.newPath).toBe(effects.oldPath);
  });

  it('answers NotFound for a deleted row, a malformed id and an id no row holds', async () => {
    await sql`update help_articles set deleted_at = now(), deleted_by = ${E.id} where id = ${subId}`;

    await expect(readHelpRenameEffects(asUser(E), subId, 'Testwort X')).rejects.toThrow(NotFound);
    await expect(readHelpRenameEffects(asUser(E), 'not-an-id', 'Testwort X')).rejects.toThrow(
      NotFound,
    );
    await expect(readHelpRenameEffects(asUser(E), NOWHERE, 'Testwort X')).rejects.toThrow(NotFound);
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])('refuses %s by direct id', async (_who, user) => {
    // Precondition: F passes the curator check, and the keeper is answered for the same id.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    await expect(readHelpRenameEffects(asUser(E), subId, 'Testwort X')).resolves.toBeDefined();

    await expect(readHelpRenameEffects(asUser(user), subId, 'Testwort X')).rejects.toThrow(
      Forbidden,
    );
  });
});
