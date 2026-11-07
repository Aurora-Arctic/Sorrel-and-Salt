import 'server-only';
import {
  findAllHelpArticleChildren,
  findHelpArticleHoldingSlug,
  findOneById,
  withAudit,
} from '@/db/repository';
import type { HelpArticleRow } from '@/db/repository';
import { expireHelp } from '@/lib/help-cache';
import { NotFound, ValidationError, fieldRefusal } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { parseInput } from '@/lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { helpArticles } from '../schema/help-articles';
import type {
  HelpArticle,
  HelpArticleInput,
  HelpArticleKind,
  HelpArticlePatch,
  HelpAudience,
} from '../types';
import {
  HelpArticleInput as InputSchema,
  HelpArticlePatch as PatchSchema,
} from '../validation/help';
import { toHelpArticle } from './rows';

// The keeper's writing of the help centre. Every call is a keeper's alone: a curator reads staff help and writes none of it.

// Slugs the routes beneath /help take for themselves.
const RESERVED_SLUGS = ['glossary', 'staff', 'search'];

const WIDTH: Record<HelpAudience, number> = { public: 0, staff: 1, keeper: 2 };

interface Merged {
  kind: HelpArticleRow['kind'];
  audience: HelpAudience;
  slug: string;
  position: number | null;
  parentId: string | null;
}

const KIND_NAMES: Record<HelpArticleKind, string> = {
  faq: 'FAQ entry',
  article: 'article',
  term: 'term',
};

async function checkSlug(
  kind: HelpArticleKind,
  slug: string,
  selfId: string | null,
): Promise<void> {
  if (slug === '')
    throw fieldRefusal('slug', 'Give the article a slug that holds a letter or a number');
  if (RESERVED_SLUGS.includes(slug)) throw fieldRefusal('slug', `“${slug}” is a page of its own`);
  const holder = await findHelpArticleHoldingSlug(kind, slug);
  if (holder && holder.id !== selfId)
    throw fieldRefusal('slug', `Another ${KIND_NAMES[kind]} holds that slug`);
}

/** The structure rules, on the row as it would stand after the write. SQL scopes the audience of a read; these rules hold the shape of a write. */
async function checkStructure(row: Merged, selfId: string | null): Promise<void> {
  if (row.kind === 'term') {
    if (row.parentId !== null) throw fieldRefusal('parentId', 'A term has no parent');
    if (row.position !== null) throw fieldRefusal('position', 'A term has no position');
    if (row.audience !== 'public') throw fieldRefusal('audience', 'A term is public');
  }

  let parent: HelpArticleRow | undefined;
  if (row.parentId !== null) {
    parent = await findOneById(helpArticles, row.parentId);
    if (!parent || parent.kind !== 'article')
      throw fieldRefusal('parentId', 'Choose an article as the parent');
    if (parent.parentId !== null)
      throw fieldRefusal('parentId', 'A child cannot be a parent: help nests one level');
    if (selfId !== null && parent.id === selfId)
      throw fieldRefusal('parentId', 'An article cannot be its own parent');
    if (selfId !== null && (await findAllHelpArticleChildren(selfId)).length > 0)
      throw fieldRefusal('parentId', 'An article with children cannot become a child');
  }

  if (parent && WIDTH[row.audience] < WIDTH[parent.audience])
    throw fieldRefusal('audience', 'A child is as wide as its parent or narrower, never wider');

  if (selfId !== null) {
    const children = await findAllHelpArticleChildren(selfId);
    if (children.some((child) => WIDTH[child.audience] < WIDTH[row.audience]))
      throw fieldRefusal('audience', 'A parent cannot be narrower than a child it holds');
  }
}

/**
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {ValidationError} refused at `slug`, `parentId`, `position` or `audience`, or invalid input.
 */
export async function createHelpArticle(
  session: Session,
  input: HelpArticleInput,
): Promise<HelpArticle> {
  assertSiteAdmin(session);
  const values = parseInput(InputSchema, input);
  const slug = slugify(values.slug ?? values.title);
  const merged: Merged = {
    kind: values.kind,
    audience: values.audience ?? 'public',
    slug,
    position: values.position ?? null,
    parentId: values.parentId ?? null,
  };
  await checkSlug(merged.kind, slug, null);
  await checkStructure(merged, null);

  const [row] = await withAudit(session, (write) =>
    write.insert(helpArticles, {
      kind: merged.kind,
      audience: merged.audience,
      title: values.title,
      slug,
      summary: values.summary ?? null,
      body: values.body,
      position: merged.position,
      parentId: merged.parentId,
    }),
  );
  expireHelp();
  return toHelpArticle(row);
}

/**
 * A title change leaves the slug where it is, since a link may hold it; only a slug in the patch moves it. A null `summary`, `position` or `parentId` clears it.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live row holds the id.
 * @throws {ValidationError} as {@link createHelpArticle}.
 */
export async function updateHelpArticle(
  session: Session,
  id: string,
  patch: HelpArticlePatch,
): Promise<HelpArticle> {
  assertSiteAdmin(session);
  const values = parseInput(PatchSchema, patch);
  const current = await findOneById(helpArticles, id);
  if (!current) throw new NotFound('Help article not found');

  const slug = values.slug == null ? current.slug : slugify(values.slug);
  const merged: Merged = {
    kind: current.kind,
    audience: values.audience ?? current.audience,
    slug,
    position: values.position === undefined ? current.position : values.position,
    parentId: values.parentId === undefined ? current.parentId : values.parentId,
  };
  if (slug !== current.slug) await checkSlug(current.kind, slug, id);
  await checkStructure(merged, id);

  const [row] = await withAudit(session, (write) =>
    write.updateById(helpArticles, id, {
      title: values.title ?? current.title,
      body: values.body ?? current.body,
      summary: values.summary === undefined ? current.summary : values.summary,
      slug,
      audience: merged.audience,
      position: merged.position,
      parentId: merged.parentId,
    }),
  );
  if (!row) throw new NotFound('Help article not found');
  expireHelp();
  return toHelpArticle(row);
}

/**
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live row holds the id.
 * @throws {ValidationError} the row is a parent with live children; delete or move them first.
 */
export async function deleteHelpArticle(session: Session, id: string): Promise<string> {
  assertSiteAdmin(session);
  const current = await findOneById(helpArticles, id);
  if (!current) throw new NotFound('Help article not found');
  if ((await findAllHelpArticleChildren(id)).length > 0)
    throw new ValidationError(
      [{ path: ['id'], message: 'Delete or move this article’s children first' }],
      'Delete or move this article’s children first',
    );
  const [row] = await withAudit(session, (write) => write.softDeleteByIds(helpArticles, [id]));
  if (!row) throw new NotFound('Help article not found');
  expireHelp();
  return row.id;
}
