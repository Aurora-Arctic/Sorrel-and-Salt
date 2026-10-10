import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import GroupList from '../../../components/GroupList';
import { groupsHref } from '../../../components/GroupList/href';
import type { GroupListEntry } from '../../../components/GroupList/types';
import { NotFound } from '../../../lib/errors';
import { MAX_PAGE_SIZE, resolvePage, resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import {
  countIngredientFormValues,
  getIngredientFormGroupBySlug,
  countIngredientFormGroups,
  listIngredientFormGroups,
} from '@/modules/vocabulary';
import FormGroupDialog from './group-dialog';
import type { AdminFormGroupsPageProps, GroupsSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Form Groups — Admin — Sorrel & Salt',
};

// One page of the groups, through the service `ingredientFormGroups` reads,
// paged by the M3.6 helper (CLAUDE.md rule 1, rule 8); the writes are the
// modal's, through the form-group mutations. Cached so a second render in the
// request reads once; "Page X of Y" beside it, counted from the page's first
// row (src/lib/pagination.ts).
const readPage = cache((after: string | undefined, before: string | undefined) =>
  resolveNumberedPage({ after, before }, listIngredientFormGroups, countIngredientFormGroups),
);

// Every group on one page of the maximum, for the delete's move picker: six
// are seeded, and an admin adds one rarely (MB.35).
const readChoices = cache(async () => {
  const page = await resolvePage({ first: MAX_PAGE_SIZE }, listIngredientFormGroups);
  return page.edges.map(({ node }) => ({ id: node.id, name: node.name }));
});

/**
 * The group `?edit=` names, and how many live forms it holds, which its
 * delete must move; none when no live group holds the address.
 */
async function readEdited(slug: string) {
  try {
    const group = await getIngredientFormGroupBySlug(slug);
    const { totalCount } = await countIngredientFormValues({ groupId: group.id }, undefined);
    return { group, memberCount: totalCount };
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

// The ingredient form groups, for an admin to add to, edit and retire
// (M5.6b), in M5.6's page shape: a modal over the list does the writing,
// opened by the address — `?new`, or `?edit=<slug>` — so it can be linked to
// and Back closes it (claude-docs/components/group-form.md, "On the admin
// pages").
export default async function AdminFormGroupsPage({ searchParams }: AdminFormGroupsPageProps) {
  await requireAdminSession();
  const params: GroupsSearchParams = await searchParams;
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;

  const [page, choices, edited] = await Promise.all([
    readPage(after, before),
    readChoices(),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  const here = { after, before };
  const groups = page.edges.map(({ node }): GroupListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    editHref: groupsHref('form', here, { edit: node.slug }),
  }));
  const closeHref = groupsHref('form', here);

  return (
    <main>
      {/* The page's one primary action on its heading's line, as every admin
          vocabulary page has it. */}
      <div className="page-header">
        <h1>Form Groups</h1>
        <Link className="btn btn--solid" href={groupsHref('form', here, 'new')}>
          Add Group
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No group has that address — it may have been renamed or deleted.
        </p>
      )}
      <GroupList
        kind="form"
        groups={groups}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? groupsHref('form', { before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? groupsHref('form', { after: page.pageInfo.endCursor })
            : undefined
        }
      />
      {adding && <FormGroupDialog title="Add Form Group" closeHref={closeHref} groups={choices} />}
      {edited && (
        <FormGroupDialog
          // A fresh form per group: one opened after another starts from its own values.
          key={edited.group.id}
          title="Edit Form Group"
          closeHref={closeHref}
          group={{
            id: edited.group.id,
            name: edited.group.name,
            description: edited.group.description,
            colorDark: '',
            colorLight: '',
          }}
          groups={choices}
          memberCount={edited.memberCount}
        />
      )}
    </main>
  );
}
