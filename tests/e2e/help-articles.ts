import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { e2eDatabaseUrl } from './database';

// The help rows the help specs read, written straight to the slot's database. The e2e servers run with the data
// cache off, so a row written here is on the next page load.

export const HELP = {
  guide: { slug: 'testwort-hearth-guide', title: 'Testwort Hearth Guide' },
  kindling: { slug: 'testwort-kindling', title: 'Testwort Kindling' },
  staffKindling: { slug: 'testwort-staff-kindling', title: 'Testwort Staff Kindling' },
  faq: { slug: 'testwort-why-the-hearth', title: 'Why Testwort the Hearth?' },
  term: { slug: 'testwort-hearthstone', title: 'Testwort Hearthstone' },
  curation: { slug: 'testwort-curation-guide', title: 'Testwort Curation Guide' },
  curationForms: { slug: 'testwort-curation-forms', title: 'Testwort Curation Forms' },
  keeper: { slug: 'testwort-keeper-ledger', title: 'Testwort Keeper Ledger' },
  gone: { slug: 'testwort-gone-guide', title: 'Testwort Gone Guide' },
} as const;

/** A word only staff rows hold, so a search for it tells a staff reader from a public one. */
export const STAFF_WORD = 'quillwort';
/** A word the public guide and its public sub page hold. */
export const PUBLIC_WORD = 'emberglow';

/** Writes the help rows, by a keeper made for the purpose, and answers the keeper's id. */
export async function seedHelpArticles(authorEmail: string): Promise<string> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  const author = randomUUID();
  try {
    await sql.begin(async (tx) => {
      // The privilege trigger refuses an undeclared keeper; this is the route a `psql` fix declares.
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${author}, 'Fixture Author', ${authorEmail}, true, 'admin', true, ${author}, ${author})`;
    });

    const guide = await insertHelpArticle(
      sql,
      {
        ...HELP.guide,
        audience: 'public',
        position: 1,
        summary: 'How a fixture hearth is lit.',
        body: `## Lighting the Testwort Hearth\n\nThe ${PUBLIC_WORD} rises. See [${HELP.term.title}](/help/glossary#${HELP.term.slug}).`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.kindling,
        audience: 'public',
        parent_id: guide,
        position: 1,
        summary: 'What a fixture burns first.',
        body: `Kindling keeps the ${PUBLIC_WORD} going.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.staffKindling,
        audience: 'staff',
        parent_id: guide,
        position: 2,
        body: `Staff notes on ${STAFF_WORD}.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.faq,
        kind: 'faq',
        audience: 'public',
        position: 1,
        body: `Because the ${PUBLIC_WORD} is warm.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.term,
        kind: 'term',
        audience: 'public',
        body: 'The stone a fixture hearth sits on.',
      },
      author,
    );
    const curation = await insertHelpArticle(
      sql,
      {
        ...HELP.curation,
        audience: 'staff',
        position: 1,
        summary: 'How a fixture curator works.',
        body: `## Curating Testwort\n\nCheck every ${STAFF_WORD} entry.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.curationForms,
        audience: 'staff',
        parent_id: curation,
        position: 1,
        body: `Forms of ${STAFF_WORD}.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      { ...HELP.keeper, audience: 'keeper', position: 2, body: 'What only a keeper reads.' },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        ...HELP.gone,
        audience: 'public',
        position: 3,
        body: `A deleted ${PUBLIC_WORD} page.`,
        deleted_at: new Date('2026-01-02T00:00:00Z'),
      },
      author,
    );
  } finally {
    await sql.end();
  }
  return author;
}

/** The precondition a 404 test leans on: the row is in the table, live or deleted as the test says. */
export async function helpRowState(slug: string): Promise<'live' | 'deleted' | 'absent'> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [row] = await sql<{ deleted: boolean }[]>`
      select deleted_at is not null as deleted from help_articles where slug = ${slug}
      order by deleted_at nulls first limit 1`;
    if (!row) return 'absent';
    return row.deleted ? 'deleted' : 'live';
  } finally {
    await sql.end();
  }
}
