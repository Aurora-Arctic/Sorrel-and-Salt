import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import GroupedValueList from '../../../components/GroupedValueList';
import { groupedValuesHref } from '../../../components/GroupedValueList/href';
import type { GroupedValueListEntry } from '../../../components/GroupedValueList/types';
import { NotFound } from '../../../lib/errors';
import { MAX_PAGE_SIZE, resolvePage, resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import {
  type IngredientFormValueFilter,
  countIngredientFormValues,
  getIngredientFormValueBySlug,
  listIngredientFormGroups,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import FormDialog from './form-dialog';
import type { AdminFormsPageProps, FormsSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Forms — Admin — Sorrel & Salt',
};

// The page and GraphQL's `ingredientFormValues` end at the same service,
// paged by the same helper (CLAUDE.md rule 1, rule 8); the writes are the
// modal's, through the ingredient-form mutations. Cached so a second render
// in the request reads once, and so keyed by primitives rather than a filter
// object.
const readForms = cache(
  async (
    query: string,
    groupId: string | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter: IngredientFormValueFilter = { query: query || undefined, groupId };
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    return resolveNumberedPage(
      { after, before },
      (request) => listIngredientFormValues(filter, request),
      (start) => countIngredientFormValues(filter, start),
    );
  },
);

// Every group on one page of the maximum: six are seeded, and an admin adds
// a group rarely (MB.35). The modal picks one by id, the list names it, and
// the filter picks one by slug.
const readGroups = cache(async () => {
  const page = await resolvePage({ first: MAX_PAGE_SIZE }, listIngredientFormGroups);
  return page.edges.map(({ node }) => ({ id: node.id, slug: node.slug, name: node.name }));
});

/**
 * The groups, then the page of forms under the filter: `?group=` names a
 * group by slug, as `?edit=` names a form, so it is resolved against the
 * groups before the list can be read. A slug no group holds is ignored, as a
 * hand-edited cursor gets the first page.
 */
async function readFiltered(
  query: string,
  groupSlug: string | undefined,
  after: string | undefined,
  before: string | undefined,
) {
  const groups = await readGroups();
  const group = groupSlug ? groups.find((each) => each.slug === groupSlug) : undefined;
  const page = await readForms(query, group?.id, after, before);
  return { groups, group, page };
}

/** The form `?edit=` names, or none when no live one holds the address. */
async function readEdited(slug: string) {
  try {
    return await getIngredientFormValueBySlug(slug);
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

// The curated ingredient-form vocabulary, for an admin to add to, edit and
// retire (M5.6a), in M5.6's page shape: a modal over the list does the
// writing, opened by the address — `?new`, or `?edit=<slug>` — so it can be
// linked to and Back closes it
// (claude-docs/components/grouped-value-form.md, "On the admin pages").
// The list narrows by `?query=` and `?group=`, which every link here keeps,
// as the categories page's does (MB.178).
export default async function AdminFormsPage({ searchParams }: AdminFormsPageProps) {
  await requireAdminSession();
  const params: FormsSearchParams = await searchParams;
  // Blank is no filter: a native submit sends `query=&group=`.
  const query = single(params.query)?.trim() ?? '';
  const groupSlug = single(params.group) || undefined;
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;

  const [{ groups, group, page }, edited] = await Promise.all([
    readFiltered(query, groupSlug, after, before),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  // Only a group that exists is kept, so an unknown slug leaves every link.
  const filter = { query, group: group?.slug ?? '' };
  const here = { ...filter, after, before };
  const groupNames = new Map(groups.map((each) => [each.id, each.name]));
  const forms = page.edges.map(({ node }): GroupedValueListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    groupName: groupNames.get(node.groupId) ?? '',
    editHref: groupedValuesHref('form', here, { edit: node.slug }),
  }));
  const closeHref = groupedValuesHref('form', here);

  return (
    <main>
      {/* The page's one primary action on its heading's line, as every admin
          vocabulary page has it. */}
      <div className="page-header">
        <h1>Forms</h1>
        <Link className="btn btn--solid" href={groupedValuesHref('form', here, 'new')}>
          Add Form
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No form has that address — it may have been renamed or deleted.
        </p>
      )}
      <GroupedValueList
        kind="form"
        values={forms}
        filter={filter}
        groups={groups}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? groupedValuesHref('form', { ...filter, before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? groupedValuesHref('form', { ...filter, after: page.pageInfo.endCursor })
            : undefined
        }
      />
      {adding && <FormDialog title="Add Form" closeHref={closeHref} groups={groups} />}
      {edited && (
        <FormDialog
          // A fresh form per form: one opened after another starts from its own values.
          key={edited.id}
          title="Edit Form"
          closeHref={closeHref}
          formValue={{
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
