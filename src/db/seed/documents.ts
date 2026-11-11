import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { beginSeedTransaction, insertStamped } from './idempotent';
import { isCalendarDay } from '../../lib/utc';
import { documents } from '../../modules/documents/schema/documents';
import { documentVersions } from '../../modules/documents/schema/document-versions';
import type { SeedDatabase, SeedDocument, SeedRunOptions, SeedTransaction } from './types';

// The site's documents (the privacy policy, the disclaimer, the code of ethics, the terms, the About Us page), seeded from the markdown files under
// `documents/`. Each file is a document and its published version 1; a document that holds any version row is left as it is, so an
// admin's published text, their draft and their deletions are never written over. Reference data: it inserts the bootstrap user itself.

/** The repo's documents folder, where `loadDocuments()` reads by default. */
export const DOCUMENTS_ROOT = 'documents';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const frontMatterSchema = z.strictObject({
  key: z.string().min(1),
  title: z.string().min(1),
  lede: z.string().min(1),
  published: z.string().refine(isCalendarDay, 'a day written YYYY-MM-DD'),
});

/** Reads every `.md` file under `root`, in name order. Throws an error naming the file whose front matter or day does not read. */
export function loadDocuments(root: string = DOCUMENTS_ROOT): SeedDocument[] {
  const folder = resolve(root);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => parseDocumentFile(name, readFileSync(join(folder, name), 'utf8')));
}

function parseDocumentFile(name: string, text: string): SeedDocument {
  const match = FRONT_MATTER.exec(text);
  if (!match)
    throw new Error(`${name}: the file does not open with front matter between --- lines`);
  const parsed = frontMatterSchema.safeParse(parseYaml(match[1]));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`${name}: ${issues.join('; ')}`);
  }
  const { key, title, lede, published } = parsed.data;
  const publishedOn = new Date(`${published}T00:00:00Z`);
  if (Number.isNaN(publishedOn.getTime()) || publishedOn.toISOString().slice(0, 10) !== published) {
    throw new Error(`${name}: published: ${published} is not a calendar day`);
  }
  const body = match[2].trim();
  if (body === '') throw new Error(`${name}: the file has no body`);
  return { key, title, lede, publishedOn, body };
}

export interface SeedDocumentsOptions extends SeedRunOptions {
  /** The documents to seed, where the default is every file under `documents/`. */
  documents?: SeedDocument[];
}

/** Seeds the documents in a transaction of its own. */
export async function seedDocuments(
  db: SeedDatabase,
  { documents: wanted, ...options }: SeedDocumentsOptions = {},
): Promise<void> {
  const files = wanted ?? loadDocuments();
  await beginSeedTransaction(db, (tx) => seedDocumentFiles(tx, files), options);
}

/**
 * The same seed inside a transaction the caller opened, since `standard` writes every reference table in its own. Assumes the GUC is
 * published and the bootstrap user exists.
 */
export async function seedDocumentFiles(
  tx: SeedTransaction,
  files: SeedDocument[] = loadDocuments(),
): Promise<void> {
  for (const file of files) {
    // Deleted rows count: a document or version a keeper deleted stays deleted.
    const [existing] = await tx.select().from(documents).where(eq(documents.key, file.key));
    if (existing) {
      const [version] = await tx
        .select({ id: documentVersions.id })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, existing.id))
        .limit(1);
      if (version) continue;
    }
    const document =
      existing ??
      (
        await insertStamped(tx, documents, [
          { key: file.key, title: file.title, lede: file.lede, seedKey: file.key },
        ])
      )[0];
    if (document.deletedAt) continue;
    await insertStamped(tx, documentVersions, [
      {
        documentId: document.id,
        number: 1,
        body: file.body,
        status: 'published',
        publishedAt: file.publishedOn,
      },
    ]);
  }
}
