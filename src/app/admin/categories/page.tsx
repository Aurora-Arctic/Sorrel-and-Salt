import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import CategoryList from '../../../components/CategoryList';
import { categoriesHref } from '../../../components/CategoryList/href';
import type { CategoryListEntry } from '../../../components/CategoryList/types';
import { NotFound } from '../../../lib/errors';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  decodeCursor,
  resolvePage,
} from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import type { ConnectionArgs } from '../../../lib/types';
import {
  countCategories,
  getCategoryBySlug,
  listCategories,
  listCategoryGroups,
} from '@/modules/vocabulary';
import CategoryDialog from './category-dialog';
import type { AdminCategoriesPageProps, CategoriesSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Categories — Admin — Sorrel & Salt',
};

// The page and GraphQL's `categories` end at the same service, paged by the
// same helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through
// the category mutations. Cached so a second render in the request reads once.
const readCategories = cache(async (after: string | undefined, before: string | undefined) => {
  const args: ConnectionArgs = before
    ? { last: DEFAULT_PAGE_SIZE, before }
    : { first: DEFAULT_PAGE_SIZE, after };
  const page = await resolvePage(args, listCategories);
  // "Page X of Y", counted from the page's first row as the compendium's
  // pager is (DESIGN.md §7): page floor(before / size) + 1 of ceil(total / size).
  const { totalCount, countBefore } = await countCategories(
    page.pageInfo.startCursor ? decodeCursor(page.pageInfo.startCursor) : undefined,
  );
  const position = {
    page: Math.floor((countBefore ?? 0) / DEFAULT_PAGE_SIZE) + 1,
    pages: Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE)),
  };
  return { ...page, position };
});

// Every group on one page of the maximum: eight are seeded, and an admin adds
// a group rarely (MB.35).
const readGroups = cache(async () => {
  const page = await resolvePage({ first: MAX_PAGE_SIZE }, listCategoryGroups);
  return page.edges.map(({ node }) => ({ id: node.id, name: node.name }));
});

/** The category `?edit=` names, or none when no live one holds the address. */
async function readEdited(slug: string) {
  try {
    return await getCategoryBySlug(slug);
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

// The global category vocabulary, for an admin to add to, edit and retire
// (M5.6). A modal over the list does the writing, opened by the address —
// `?new`, or `?edit=<slug>` — so it can be linked to and Back closes it
// (claude-docs/components/category-form.md, "On the admin page").
export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  await requireAdminSession();
  const params: CategoriesSearchParams = await searchParams;
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const cursor = { after, before };
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;

  const [page, groups, edited] = await Promise.all([
    readCategories(after, before),
    readGroups(),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const categories = page.edges.map(({ node }): CategoryListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    groupName: groupNames.get(node.groupId) ?? '',
    editHref: categoriesHref(cursor, { edit: node.slug }),
  }));
  const closeHref = categoriesHref(cursor);

  return (
    <main>
      {/* The page's one primary action on its heading's line, as every admin
          vocabulary page has it. */}
      <div className="page-header">
        <h1>Categories</h1>
        <Link className="btn btn--solid" href={categoriesHref(cursor, 'new')}>
          Add Category
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No category has that address — it may have been renamed or deleted.
        </p>
      )}
      <CategoryList
        categories={categories}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? categoriesHref({ before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? categoriesHref({ after: page.pageInfo.endCursor })
            : undefined
        }
      />
      {adding && <CategoryDialog title="Add Category" closeHref={closeHref} groups={groups} />}
      {edited && (
        <CategoryDialog
          // A fresh form per category: one opened after another starts from its own values.
          key={edited.id}
          title="Edit Category"
          closeHref={closeHref}
          category={{
            id: edited.id,
            name: edited.name,
            description: edited.description,
            groupId: edited.groupId,
          }}
          groups={groups}
        />
      )}
    </main>
  );
}
