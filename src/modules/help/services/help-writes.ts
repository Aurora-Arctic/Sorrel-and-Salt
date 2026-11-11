import 'server-only';
import {
  findAllHelpArticleChildren,
  findAllHelpOrdered,
  findHelpArticleHoldingSlug,
  findLastHelpPosition,
  findManyByIds,
  findOneById,
  withAudit,
} from '@/db/repository';
import type { AuditWriter, HelpArticleRow } from '@/db/repository';
import { HELP_AUDIENCE_RANK } from '@/lib/help-audience';
import { expireHelp } from '@/lib/help-cache';
import { NotFound, ValidationError, fieldRefusal } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { isRowId, parseInput } from '@/lib/validation';
import type { z } from 'zod';
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
import { requireHelpArticle } from './help-reads';
import { assertMarksExist, assertWidgetsKnown } from './marks';
import { NO_HELP_ARTICLE, toHelpArticles } from './rows';

// The keeper's writing of the help centre. Every call is a keeper's alone: a curator reads staff help and writes none of it.

// A slug is always slugify(title), never typed: a title change moves the address. Slugs the routes beneath /help take for themselves.
const RESERVED_SLUGS = ['glossary', 'staff', 'search'];

interface Merged {
  kind: HelpArticleRow['kind'];
  audience: HelpAudience;
  slug: string;
  position: number | null;
  parentId: string | null;
  /** The children the save sets, in order; undefined leaves them as they are. */
  childIds: readonly string[] | undefined;
}

const KIND_NAMES: Record<HelpArticleKind, string> = {
  faq: 'FAQ entry',
  article: 'article',
  guide: 'guide',
  term: 'term',
};

const A_KIND: Record<HelpArticleKind, string> = {
  faq: 'An FAQ entry',
  article: 'An article',
  guide: 'A guide',
  term: 'A term',
};

const isPage = (kind: HelpArticleKind): boolean => kind === 'article' || kind === 'guide';

async function checkSlug(
  kind: HelpArticleKind,
  slug: string,
  selfId: string | null,
): Promise<void> {
  if (slug === '')
    throw fieldRefusal('title', 'Give a title with a letter or a number, so it makes an address');
  if (RESERVED_SLUGS.includes(slug))
    throw fieldRefusal(
      'title',
      `That title makes the address “${slug}”, which is a page of its own`,
    );
  const holder = await findHelpArticleHoldingSlug(kind, slug);
  if (holder && holder.id !== selfId)
    throw fieldRefusal(
      'title',
      isPage(kind)
        ? 'Another article or guide has a title that makes the same address'
        : `Another ${KIND_NAMES[kind]} has a title that makes the same address`,
    );
}

/** A top-level page given no place goes after every guide, so last in its audience's group in the Guides bar. */
const lastGuidePlace = async (): Promise<number> => (await findLastHelpPosition('guides')) + 1;

/** A new FAQ entry given no place goes after every live FAQ entry. */
const lastFaqPlace = async (): Promise<number> => (await findLastHelpPosition('faq')) + 1;

/** Only a guide or an article carries a summary; the check reads the value sent, so a row saved before the rule still saves. */
function checkSummary(kind: HelpArticleKind, summary: string | null | undefined): void {
  if (!isPage(kind) && summary != null)
    throw fieldRefusal('summary', `${A_KIND[kind]} has no summary`);
}

/** The structure rules, on the row as it would stand after the write. SQL scopes the audience of a read; these rules hold the shape of a write. */
async function checkStructure(row: Merged, selfId: string | null): Promise<void> {
  if (row.kind === 'term') {
    if (row.parentId !== null) throw fieldRefusal('parentId', 'A term has no parent');
    if (row.position !== null) throw fieldRefusal('position', 'A term has no position');
    if (row.audience !== 'public') throw fieldRefusal('audience', 'A term is public');
  }

  if (row.kind !== 'article' && row.parentId !== null)
    throw fieldRefusal(
      'parentId',
      row.kind === 'guide'
        ? 'A guide has no parent: it is a top-level page'
        : `${A_KIND[row.kind]} has no parent: only an article is a sub page`,
    );

  let parent: HelpArticleRow | undefined;
  if (row.parentId !== null) {
    parent = await findOneById(helpArticles, row.parentId);
    if (!parent || parent.kind !== 'guide')
      throw fieldRefusal('parentId', 'Choose a guide as the parent');
    if (parent.parentId !== null)
      throw fieldRefusal('parentId', 'A child cannot be a parent: help nests one level');
    if (selfId !== null && parent.id === selfId)
      throw fieldRefusal('parentId', 'An article cannot be its own parent');
    if (selfId !== null && (await findAllHelpArticleChildren(selfId)).length > 0)
      throw fieldRefusal('parentId', 'An article with children cannot become a child');
  }

  if (parent && HELP_AUDIENCE_RANK[row.audience] < HELP_AUDIENCE_RANK[parent.audience])
    throw fieldRefusal('audience', 'A child is as wide as its parent or narrower, never wider');

  // A save that names its children is checked on those; the ones it leaves out are released, so their width no longer binds.
  if (selfId !== null && row.childIds === undefined) {
    const children = await findAllHelpArticleChildren(selfId);
    if (
      children.some(
        (child) => HELP_AUDIENCE_RANK[child.audience] < HELP_AUDIENCE_RANK[row.audience],
      )
    )
      throw fieldRefusal('audience', 'A parent cannot be narrower than a child it holds');
  }
}

/** The rows a save's `childIds` names, in list order, once each is checked as a child this row may take. */
async function checkChildren(row: Merged, selfId: string | null): Promise<HelpArticleRow[]> {
  const ids = row.childIds ?? [];
  if (ids.length === 0) return [];
  if (row.kind !== 'guide') throw fieldRefusal('childIds', 'Only a guide holds sub pages');
  if (row.parentId !== null)
    throw fieldRefusal('childIds', 'A child cannot hold children: help nests one level');
  if (selfId !== null && ids.includes(selfId))
    throw fieldRefusal('childIds', 'An article cannot be its own child');

  const found = new Map(
    (await findManyByIds(helpArticles, [...ids])).map((child) => [child.id, child]),
  );
  const children = ids.map((id) => found.get(id));
  if (children.some((child) => child === undefined))
    throw fieldRefusal('childIds', 'Choose live articles as the children');
  const rows = children as HelpArticleRow[];
  if (rows.some((child) => child.kind !== 'article'))
    throw fieldRefusal(
      'childIds',
      'Choose articles as the sub pages, not guides, FAQ entries or terms',
    );
  if (rows.some((child) => HELP_AUDIENCE_RANK[child.audience] < HELP_AUDIENCE_RANK[row.audience]))
    throw fieldRefusal('childIds', 'A child is as wide as its parent or narrower, never wider');
  for (const child of rows) {
    if ((await findAllHelpArticleChildren(child.id)).length > 0)
      throw fieldRefusal(
        'childIds',
        `“${child.title}” holds children of its own, and help nests one level`,
      );
  }
  return rows;
}

/**
 * A kind changes only between article and guide, on the row as it would stand after the save: an article becomes a guide
 * only at the top level, and a guide an article only once it holds no live sub page.
 */
async function checkKindChange(from: HelpArticleKind, row: Merged, selfId: string): Promise<void> {
  if (row.kind === from) return;
  if (from === 'article' && row.kind === 'guide') {
    if (row.parentId !== null)
      throw fieldRefusal('kind', 'A sub page cannot be a guide: choose No Parent first');
    return;
  }
  if (from === 'guide' && row.kind === 'article') {
    const held = row.childIds ?? (await findAllHelpArticleChildren(selfId));
    if (held.length > 0)
      throw fieldRefusal(
        'kind',
        'A guide holding sub pages cannot be an article: move or delete its sub pages first',
      );
    return;
  }
  throw fieldRefusal(
    'kind',
    `${A_KIND[from]} keeps its kind: only an article and a guide change kind`,
  );
}

/**
 * Sets the parent's children to `childIds`, in order, inside the save's transaction: each listed one is placed 1, 2, 3…
 * beneath it, moved from any other parent; each live child left out goes to the top level, after the last top-level article.
 */
async function placeChildren(
  write: AuditWriter,
  parentId: string,
  childIds: readonly string[],
  released: readonly HelpArticleRow[],
): Promise<void> {
  for (const [index, childId] of childIds.entries())
    await write.updateById(helpArticles, childId, { parentId, position: index + 1 });
  if (released.length === 0) return;
  const last = await findLastHelpPosition('guides');
  for (const [index, child] of released.entries())
    await write.updateById(helpArticles, child.id, { parentId: null, position: last + index + 1 });
}

async function releasedBy(
  parentId: string,
  childIds: readonly string[],
): Promise<HelpArticleRow[]> {
  const kept = new Set(childIds);
  return (await findAllHelpArticleChildren(parentId)).filter((child) => !kept.has(child.id));
}

/** parseInput, with the first issue's sentence as the message, since the help form shows a refusal's message as well as its field. */
function parseSaying<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  try {
    return parseInput(schema, input);
  } catch (error) {
    if (!(error instanceof ValidationError) || error.issues.length === 0) throw error;
    throw new ValidationError(error.issues, error.issues[0].message);
  }
}

/**
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {ValidationError} refused at `title` (it makes no address, a reserved one or a taken one), `parentId`, `position`, `audience`, `childIds` or `body` (a mark naming a term the glossary lacks), or invalid input.
 */
export async function createHelpArticle(
  session: Session,
  input: HelpArticleInput,
): Promise<HelpArticle> {
  assertSiteAdmin(session);
  const values = parseSaying(InputSchema, input);
  const slug = slugify(values.title);
  const merged: Merged = {
    kind: values.kind,
    audience: values.audience ?? 'public',
    slug,
    position:
      values.position ??
      (isPage(values.kind) && values.parentId == null
        ? await lastGuidePlace()
        : values.kind === 'faq'
          ? await lastFaqPlace()
          : null),
    parentId: values.parentId ?? null,
    childIds: values.childIds ?? undefined,
  };
  checkSummary(merged.kind, values.summary);
  await checkSlug(merged.kind, slug, null);
  await checkStructure(merged, null);
  await checkChildren(merged, null);
  assertWidgetsKnown(values.body);
  await assertMarksExist(values.body, { kind: merged.kind, title: values.title, slug });

  const row = await withAudit(session, async (write) => {
    const [inserted] = await write.insert(helpArticles, {
      kind: merged.kind,
      audience: merged.audience,
      title: values.title,
      slug,
      summary: values.summary ?? null,
      searchTerms: values.searchTerms ?? null,
      body: values.body,
      position: merged.position,
      parentId: merged.parentId,
    });
    if (merged.childIds) await placeChildren(write, inserted.id, merged.childIds, []);
    return inserted;
  });
  expireHelp();
  return (await toHelpArticles([row], 'keeper'))[0];
}

/**
 * A title change moves the slug with it. A null `summary`, `searchTerms`, `position` or `parentId` clears it; `childIds` left out leaves the children as they are.
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
  const values = parseSaying(PatchSchema, patch);
  const current = await requireHelpArticle(id);

  const slug = values.title == null ? current.slug : slugify(values.title);
  const merged: Merged = {
    kind: values.kind ?? current.kind,
    audience: values.audience ?? current.audience,
    slug,
    position:
      values.position !== undefined
        ? values.position
        : current.parentId !== null && values.parentId === null
          ? await lastGuidePlace()
          : current.position,
    parentId: values.parentId === undefined ? current.parentId : values.parentId,
    childIds: values.childIds ?? undefined,
  };
  await checkKindChange(current.kind, merged, id);
  checkSummary(merged.kind, values.summary);
  if (slug !== current.slug) await checkSlug(merged.kind, slug, id);
  await checkStructure(merged, id);
  await checkChildren(merged, id);
  const released = merged.childIds ? await releasedBy(id, merged.childIds) : [];
  if (values.body != null && values.body !== current.body) {
    assertWidgetsKnown(values.body);
    await assertMarksExist(values.body, {
      kind: merged.kind,
      title: values.title ?? current.title,
      slug,
    });
  }

  const row = await withAudit(session, async (write) => {
    const [updated] = await write.updateById(helpArticles, id, {
      kind: merged.kind,
      title: values.title ?? current.title,
      body: values.body ?? current.body,
      summary: values.summary === undefined ? current.summary : values.summary,
      searchTerms: values.searchTerms === undefined ? current.searchTerms : values.searchTerms,
      slug,
      audience: merged.audience,
      position: merged.position,
      parentId: merged.parentId,
    });
    if (updated && merged.childIds) await placeChildren(write, id, merged.childIds, released);
    return updated;
  });
  if (!row) throw new NotFound(NO_HELP_ARTICLE);
  expireHelp();
  return (await toHelpArticles([row], 'keeper'))[0];
}

/**
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live row holds the id.
 * @throws {ValidationError} the row is a parent with live children; delete or move them first.
 */
export async function deleteHelpArticle(session: Session, id: string): Promise<string> {
  assertSiteAdmin(session);
  await requireHelpArticle(id);
  if ((await findAllHelpArticleChildren(id)).length > 0)
    throw fieldRefusal('id', 'Delete or move this article’s children first');
  const [row] = await withAudit(session, (write) => write.softDeleteByIds(helpArticles, [id]));
  if (!row) throw new NotFound(NO_HELP_ARTICLE);
  expireHelp();
  return row.id;
}

/**
 * Shows or hides one live row. A hidden row stays the keepers' to edit and reaches no reader; a hidden parent hides its children with it, whose own flags stay as they were.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live row holds the id.
 */
export async function setHelpArticleShown(
  session: Session,
  id: string,
  shown: boolean,
): Promise<HelpArticle> {
  assertSiteAdmin(session);
  if (!isRowId(id)) throw new NotFound(NO_HELP_ARTICLE);
  const [row] = await withAudit(session, (write) => write.updateById(helpArticles, id, { shown }));
  if (!row) throw new NotFound(NO_HELP_ARTICLE);
  expireHelp();
  return (await toHelpArticles([row], 'keeper'))[0];
}

const ORDERED_NAMES = { guides: 'guide', faq: 'FAQ entry' } as const;

async function placeAll(
  session: Session,
  list: 'guides' | 'faq',
  ids: readonly string[],
): Promise<HelpArticle[]> {
  assertSiteAdmin(session);
  const name = ORDERED_NAMES[list];
  const live = await findAllHelpOrdered(list);
  const liveIds = new Set(live.map((row) => row.id));
  const exact =
    ids.length === liveIds.size &&
    new Set(ids).size === ids.length &&
    ids.every((id) => liveIds.has(id));
  if (!exact) {
    const message = `List every ${name} once, and nothing else; the list has changed since it was read`;
    throw fieldRefusal('ids', message);
  }
  if (list === 'guides') {
    const rankOf = new Map(live.map((row) => [row.id, HELP_AUDIENCE_RANK[row.audience]]));
    const grouped = ids.every((id, at) => at === 0 || rankOf.get(ids[at - 1])! <= rankOf.get(id)!);
    if (!grouped) {
      const message =
        'List the guides by audience, Public, then Staff, then Keeper; a guide moves only among guides of its own audience';
      throw fieldRefusal('ids', message);
    }
  }
  const rows = await withAudit(session, async (write) => {
    const placed: HelpArticleRow[] = [];
    for (const [index, id] of ids.entries()) {
      const [row] = await write.updateById(helpArticles, id, { position: index + 1 });
      placed.push(row);
    }
    return placed;
  });
  expireHelp();
  return toHelpArticles(rows, 'keeper');
}

/**
 * Places every live top-level guide, hidden ones included, 1, 2, 3… in the order given, in one write, the list grouped
 * by audience.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {ValidationError} refused at `ids`: the list is not every live top-level guide exactly once, or it
 *   interleaves audiences rather than listing Public, then Staff, then Keeper.
 */
export function orderHelpGuides(session: Session, ids: readonly string[]): Promise<HelpArticle[]> {
  return placeAll(session, 'guides', ids);
}

/**
 * Places every live FAQ entry, hidden ones included, 1, 2, 3… in the order given, in one write.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {ValidationError} refused at `ids`: the list is not every live FAQ entry exactly once.
 */
export function orderHelpFaq(session: Session, ids: readonly string[]): Promise<HelpArticle[]> {
  return placeAll(session, 'faq', ids);
}
