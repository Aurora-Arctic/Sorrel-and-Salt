import { eq } from 'drizzle-orm';
import { helpArticles } from '../../modules/help/schema/help-articles';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION, touched } from './bootstrap-admin';
import { FAQ_ENTRIES } from './help-content/faq';
import { GLOSSARY_ENTRIES } from './help-content/glossary';
import { PUBLIC_ARTICLES } from './help-content/articles';
import { STAFF_ARTICLES } from './help-content/staff';
import { beginSeedTransaction, insertStamped } from './idempotent';
import { slugify } from '../../lib/slugify';
import type { SeedDatabase, SeedHelpArticle, SeedRunOptions, SeedTransaction } from './types';

// The help centre's entries: the FAQ, the articles with their sub pages, and the glossary, seeded from the modules under
// `help-content/`. Rows are found by `seed_key`, deleted ones included. A row nobody but the seed has written is restated to the
// list's current text; one a person edited is left as they wrote it, and one a person deleted is never written again.

/** Every entry of the shipped list: parents before their sub pages. */
export function loadHelpArticles(): SeedHelpArticle[] {
  return [...FAQ_ENTRIES, ...PUBLIC_ARTICLES, ...STAFF_ARTICLES, ...GLOSSARY_ENTRIES];
}

export interface SeedHelpOptions extends SeedRunOptions {
  /** The entries to seed, where the default is the shipped list. */
  articles?: SeedHelpArticle[];
}

/** Seeds the help entries in a transaction of its own. */
export async function seedHelp(
  db: SeedDatabase,
  { articles: wanted, ...options }: SeedHelpOptions = {},
): Promise<void> {
  const entries = wanted ?? loadHelpArticles();
  await beginSeedTransaction(db, (tx) => seedHelpEntries(tx, entries), options);
}

/** The same seed inside a transaction the caller opened. Assumes the GUC is published and the bootstrap user exists. */
export async function seedHelpEntries(
  tx: SeedTransaction,
  entries: SeedHelpArticle[],
): Promise<void> {
  const present = await tx.select().from(helpArticles);
  const rowByKey = new Map(
    present.flatMap((row) => (row.seedKey === null ? [] : [[row.seedKey, row]])),
  );
  const idByKey = new Map(
    present.flatMap((row) => (row.seedKey === null ? [] : [[row.seedKey, row.id]])),
  );
  // A parent comes before its sub pages, whatever order the list was written in.
  const ordered = [...entries].sort(
    (a, b) => Number(a.parent !== null) - Number(b.parent !== null),
  );

  for (const entry of ordered) {
    const existing = rowByKey.get(entry.seedKey);
    if (existing?.deletedAt) continue;
    const parentId = entry.parent === null ? null : (idByKey.get(entry.parent) ?? null);
    if (entry.parent !== null && parentId === null) {
      throw new Error(
        `${entry.seedKey}: its parent ${entry.parent} is not in the list or the table`,
      );
    }
    const values = {
      kind: entry.kind,
      audience: entry.audience,
      title: entry.title,
      slug: slugify(entry.title),
      summary: entry.summary,
      body: entry.body,
      position: entry.position,
      parentId,
    };
    if (existing === undefined) {
      const [row] = await insertStamped(tx, helpArticles, [{ ...values, seedKey: entry.seedKey }]);
      idByKey.set(entry.seedKey, row.id);
      continue;
    }
    if (touched(existing)) continue;
    await tx
      .update(helpArticles)
      .set(applyAudit('update', values, BOOTSTRAP_SESSION))
      .where(eq(helpArticles.id, existing.id));
  }
}
