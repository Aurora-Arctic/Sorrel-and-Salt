import 'server-only';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupKind } from '../../components/GroupForm/types';
import GroupList from '../../components/GroupList';
import { groupsHref } from '../../components/GroupList/href';
import type { GroupListEntry } from '../../components/GroupList/types';
import { MAX_PAGE_SIZE, resolvePage, resolveNumberedPage } from '../../lib/pagination';
import { requireAdminSession } from '../../lib/request-session';
import {
  countCategories,
  countCategoryGroups,
  countDeities,
  countDeityTraditions,
  countIngredientFormGroups,
  countIngredientFormValues,
  getCategoryGroupBySlug,
  getDeityTraditionBySlug,
  getIngredientFormGroupBySlug,
  listCategoryGroups,
  listDeityTraditions,
  listIngredientFormGroups,
} from '@/modules/vocabulary';
import GroupDialog from './group-dialog';
import { pagerHrefs, readListPlace, readOrMissing } from './list-page';
import MissingNotice from './missing-notice';
import type { GroupKindPage, GroupPageProps } from './types';

// The page every group vocabulary shares (MB.115): the category groups and
// the form groups (M5.6b) and the deity traditions (MB.132), written once
// after three routes had each carried a noun-swapped copy. Each route's
// `page.tsx` keeps its `metadata` and hands its kind and address here; the
// heading and tabs are its route group's layout's (MB.115). One
// page of groups through the service GraphQL reads too, paged by the M3.6
// helper (CLAUDE.md rule 1, rule 8); the writes are the modal's.

/** What tells one group page from another: its copy and its readers. */
const GROUP_KINDS: Record<GroupKind, GroupKindPage> = {
  category: {
    noun: 'group',
    add: 'Add Group',
    addTitle: 'Add Category Group',
    editTitle: 'Edit Category Group',
    list: listCategoryGroups,
    count: countCategoryGroups,
    getBySlug: getCategoryGroupBySlug,
    countMembers: async (groupId) => (await countCategories({ groupId }, undefined)).totalCount,
  },
  form: {
    noun: 'group',
    add: 'Add Group',
    addTitle: 'Add Form Group',
    editTitle: 'Edit Form Group',
    list: listIngredientFormGroups,
    count: countIngredientFormGroups,
    getBySlug: getIngredientFormGroupBySlug,
    countMembers: async (groupId) =>
      (await countIngredientFormValues({ groupId }, undefined)).totalCount,
  },
  tradition: {
    noun: 'tradition',
    add: 'Add Tradition',
    addTitle: 'Add Tradition',
    editTitle: 'Edit Tradition',
    list: listDeityTraditions,
    count: countDeityTraditions,
    getBySlug: getDeityTraditionBySlug,
    countMembers: async (traditionId) =>
      (await countDeities({ traditionId }, undefined)).totalCount,
  },
};

// One page of the kind's groups, "Page X of Y" beside it, counted from the
// page's first row (src/lib/pagination.ts). Cached so a second render in the
// request reads once.
const readPage = cache((kind: GroupKind, after: string | undefined, before: string | undefined) =>
  resolveNumberedPage({ after, before }, GROUP_KINDS[kind].list, GROUP_KINDS[kind].count),
);

// Every group on one page of the maximum, for the delete's move picker and,
// for a category group, the colour pickers' near-colour warning: an admin
// adds a group rarely (MB.35).
const readChoices = cache(async (kind: GroupKind) => {
  const page = await resolvePage({ first: MAX_PAGE_SIZE }, GROUP_KINDS[kind].list);
  return page.edges.map(({ node }) => ({
    id: node.id,
    name: node.name,
    colorDark: node.colorDark,
    colorLight: node.colorLight,
  }));
});

/** The group `?edit=` names, and how many live rows it holds, which its delete must move. */
async function readEdited(kind: GroupKind, slug: string) {
  const group = await GROUP_KINDS[kind].getBySlug(slug);
  return { group, memberCount: await GROUP_KINDS[kind].countMembers(group.id) };
}

/**
 * The kind's Add, the open tab's action beside the page's heading: its
 * route group's `@action` slot renders it, so it changes with the tab
 * (claude-docs/components/tabbed-page.md). It keeps the list's cursor, as
 * every link on the page does.
 */
export async function GroupAction({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  await requireAdminSession();
  const { after, before } = readListPlace(await searchParams);
  return (
    <Link className="btn btn--solid" href={groupsHref(kind, { after, before }, 'new')}>
      {GROUP_KINDS[kind].add}
    </Link>
  );
}

/**
 * A group vocabulary, for an admin to add to, edit and retire. A modal over
 * the list does the writing, opened by the address — `?new`, or
 * `?edit=<slug>` — so it can be linked to and Back closes it
 * (claude-docs/components/group-form.md, "On the admin pages").
 */
export async function GroupPage({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  await requireAdminSession();
  const { after, before, editSlug, adding } = readListPlace(await searchParams);
  const { noun, addTitle, editTitle } = GROUP_KINDS[kind];

  const [page, choices, edited] = await Promise.all([
    readPage(kind, after, before),
    readChoices(kind),
    !adding && editSlug ? readOrMissing(() => readEdited(kind, editSlug)) : undefined,
  ]);
  const here = { after, before };
  const groups = page.edges.map(({ node }): GroupListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    colorDark: node.colorDark,
    colorLight: node.colorLight,
    editHref: groupsHref(kind, here, { edit: node.slug }),
  }));
  const closeHref = groupsHref(kind, here);

  return (
    <>
      {!adding && editSlug && !edited && <MissingNotice noun={noun} />}
      <GroupList
        kind={kind}
        groups={groups}
        position={page.position}
        {...pagerHrefs(page.pageInfo, (cursor) => groupsHref(kind, cursor))}
      />
      {adding && (
        <GroupDialog kind={kind} title={addTitle} closeHref={closeHref} groups={choices} />
      )}
      {edited && (
        <GroupDialog
          // A fresh form per group: one opened after another starts from its own values.
          key={edited.group.id}
          kind={kind}
          title={editTitle}
          closeHref={closeHref}
          group={{
            id: edited.group.id,
            name: edited.group.name,
            description: edited.group.description,
            // A form group's and a tradition's are `''`: they have none.
            colorDark: edited.group.colorDark ?? '',
            colorLight: edited.group.colorLight ?? '',
          }}
          groups={choices}
          memberCount={edited.memberCount}
        />
      )}
    </>
  );
}
