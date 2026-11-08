import { eq } from 'drizzle-orm';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
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
// list's current text; one a person edited is left as they wrote it, and one a person deleted is never written again. A row
// whose entry left the list is retired, before any insert so a new entry may take its slug, unless a person edited it or a
// live sub page staying behind hangs beneath it; one the seed retired is revived when its entry returns
// (claude-docs/design-decisions/support.md, "The help seed").

/** Every entry of the shipped list: parents before their sub pages. */
export function loadHelpArticles(): SeedHelpArticle[] {
  return [...FAQ_ENTRIES, ...PUBLIC_ARTICLES, ...STAFF_ARTICLES, ...GLOSSARY_ENTRIES];
}

export interface SeedHelpOptions extends SeedRunOptions {
  /** The entries to seed, where the default is the shipped list. */
  articles?: SeedHelpArticle[];
}

/** Seeds the help entries in a transaction of its own; returns a `RETIRED` or `KEPT` line per entry the list dropped. */
export async function seedHelp(
  db: SeedDatabase,
  { articles: wanted, ...options }: SeedHelpOptions = {},
): Promise<string[]> {
  const entries = wanted ?? loadHelpArticles();
  return beginSeedTransaction(db, (tx) => seedHelpEntries(tx, entries), options);
}

/** The same seed inside a transaction the caller opened. Assumes the GUC is published and the bootstrap user exists. */
export async function seedHelpEntries(
  tx: SeedTransaction,
  entries: SeedHelpArticle[],
): Promise<string[]> {
  const present = await tx.select().from(helpArticles);
  const lines = await retireDropped(tx, present, new Set(entries.map((entry) => entry.seedKey)));
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
    if (existing?.deletedAt && existing.deletedBy !== BOOTSTRAP_USER_ID) continue;
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
      // The deletion stamps sit outside applyAudit, which drops every audit field from its payload.
      .set({ ...applyAudit('update', values, BOOTSTRAP_SESSION), deletedAt: null, deletedBy: null })
      .where(eq(helpArticles.id, existing.id));
  }
  return lines;
}

type HelpRow = typeof helpArticles.$inferSelect;

/**
 * Soft-deletes each live seeded row whose key left the list, sub pages before their parents, and returns a line for each:
 * `RETIRED`, or `KEPT` with the reason when a person edited it or a live sub page that stays hangs beneath it.
 */
async function retireDropped(
  tx: SeedTransaction,
  present: HelpRow[],
  listed: Set<string>,
): Promise<string[]> {
  const live = present.filter((row) => row.deletedAt === null);
  const dropped = live.filter((row) => row.seedKey !== null && !listed.has(row.seedKey));
  const lines: string[] = [];
  const retired = new Set<string>();
  let pending = dropped.filter((row) => {
    if (!touched(row)) return true;
    lines.push(`KEPT ${row.seedKey}: edited by a person`);
    return false;
  });
  // Each pass retires the rows whose live sub pages are all retired already, so the deepest go first.
  for (;;) {
    const ready = pending.filter((row) =>
      live.every((child) => child.parentId !== row.id || retired.has(child.id)),
    );
    if (ready.length === 0) break;
    for (const row of ready) {
      await tx
        .update(helpArticles)
        .set(applyAudit('delete', {}, BOOTSTRAP_SESSION))
        .where(eq(helpArticles.id, row.id));
      retired.add(row.id);
      lines.push(`RETIRED ${row.seedKey}`);
    }
    pending = pending.filter((row) => !retired.has(row.id));
  }
  for (const row of pending) lines.push(`KEPT ${row.seedKey}: has live sub pages`);
  return lines;
}
