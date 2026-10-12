import 'server-only';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupKind } from '../../components/GroupForm/types';
import GroupList from '../../components/GroupList';
import { groupsHref } from '../../components/GroupList/href';
import { KINDS } from '../../components/GroupList/kinds';
import type { GroupListEntry } from '../../components/GroupList/types';
import { resolveNumberedPage } from '../../lib/pagination';
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
import { GROUP_READERS } from './group-readers';
import { AddAction, pagerHrefs, readEditPlace, readListPlace } from './list-page';
import MissingNotice from './missing-notice';
import type { GroupKindPage, GroupPageProps, GroupSearchParams } from './types';

// The page every group vocabulary shares (MB.115): the category groups and
// the form groups (M5.6b) and the deity traditions (MB.132), written once
// after three routes had each carried a noun-swapped copy. Each route's
// `page.tsx` keeps its `metadata` and hands its kind and address here; the
// heading and tabs are its route group's layout's (MB.115). One
// page of groups through the service GraphQL reads too, paged by the M3.6
// helper (CLAUDE.md rule 1, rule 8); the writes are the modal's. A kind
// with `search` narrows the list by `?query=`, in SQL, which every link here
// keeps; the traditions alone take it (MB.115).

/**
 * What tells one group page from another: its copy and its readers. A kind
 * without a search is handed no filter, since `readPlace` reads no query for
 * it, so its readers take none: its services have no filter to take.
 */
const GROUP_KINDS: Record<GroupKind, GroupKindPage> = {
  category: {
    search: false,
    list: (page) => listCategoryGroups(page),
    count: (start) => countCategoryGroups(start),
    getBySlug: getCategoryGroupBySlug,
    countMembers: async (groupId) => (await countCategories({ groupId }, undefined)).totalCount,
  },
  form: {
    search: false,
    list: (page) => listIngredientFormGroups(page),
    count: (start) => countIngredientFormGroups(start),
    getBySlug: getIngredientFormGroupBySlug,
    countMembers: async (groupId) =>
      (await countIngredientFormValues({ groupId }, undefined)).totalCount,
  },
  tradition: {
    search: true,
    list: listDeityTraditions,
    count: countDeityTraditions,
    getBySlug: getDeityTraditionBySlug,
    countMembers: async (traditionId) =>
      (await countDeities({ traditionId }, undefined)).totalCount,
  },
};

// One page of the kind's groups under the search, "Page X of Y" beside it,
// counted from the page's first row (src/lib/pagination.ts). Cached so a
// second render in the request reads once, and so keyed by primitives rather
// than a filter object.
const readPage = cache(
  (kind: GroupKind, query: string, after: string | undefined, before: string | undefined) => {
    const { list, count } = GROUP_KINDS[kind];
    // A blank query is no filter, and a kind without a search is handed none.
    const filter = query ? { query } : undefined;
    return resolveNumberedPage(
      { after, before },
      (request) => list(request, filter),
      (start) => count(start, filter),
    );
  },
);

/**
 * Where the address puts the list: its search, cursor and modal. A kind
 * without a search reads no `?query=`, so a hand-written one leaves every
 * link, as an unreadable cursor does.
 */
function readPlace(kind: GroupKind, params: GroupSearchParams) {
  const { query, after, before, editSlug, adding } = readListPlace(params);
  const shown = GROUP_KINDS[kind].search ? query : '';
  return { query: shown, here: { query: shown, after, before }, editSlug, adding };
}

// Every group on one page of the maximum, for the delete's move picker and,
// for a category group, the colour pickers' near-colour warning: an admin
// adds a group rarely (MB.35).
// The curated kind's own read of its groups, which its page shares (`group-readers.ts`).
const readChoices = (kind: GroupKind) => GROUP_READERS[KINDS[kind].holds]();

/** The group `?edit=` names, and how many live rows it holds, which its delete must move. */
async function readGroup(kind: GroupKind, slug: string) {
  const group = await GROUP_KINDS[kind].getBySlug(slug);
  return { group, memberCount: await GROUP_KINDS[kind].countMembers(group.id) };
}

/**
 * The kind's Add, the open tab's action beside the page's heading: its
 * route group's `@action` slot renders it, so it changes with the tab
 * (claude-docs/components/tabbed-page.md). It keeps the list's search and
 * cursor, as every link on the page does.
 */
export async function GroupAction({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  await requireAdminSession();
  const { here } = readPlace(kind, await searchParams);
  return <AddAction href={groupsHref(kind, here, 'new')}>{KINDS[kind].add}</AddAction>;
}

/**
 * A group vocabulary, for an admin to add to, edit and retire. A modal over
 * the list does the writing, opened by the address — `?new`, or
 * `?edit=<slug>` — so it can be linked to and Back closes it
 * (claude-docs/components/group-form.md, "On the admin pages").
 */
export async function GroupPage({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  await requireAdminSession();
  const place = readPlace(kind, await searchParams);
  const { query, here, adding } = place;
  const { noun, label } = KINDS[kind];
  const { search } = GROUP_KINDS[kind];

  const [page, choices, { edited, missing }] = await Promise.all([
    readPage(kind, query, here.after, here.before),
    readChoices(kind),
    readEditPlace(place, (slug) => readGroup(kind, slug)),
  ]);
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
      {missing && <MissingNotice noun={noun} />}
      <GroupList
        kind={kind}
        groups={groups}
        position={page.position}
        filter={search ? { query } : undefined}
        {...pagerHrefs(page.pageInfo, (cursor) => groupsHref(kind, { query, ...cursor }))}
      />
      {adding && (
        <GroupDialog
          kind={kind}
          heading={{ title: `Add ${label}` }}
          closeHref={closeHref}
          groups={choices}
        />
      )}
      {edited && (
        <GroupDialog
          // A fresh form per group: one opened after another starts from its own values.
          key={edited.group.id}
          kind={kind}
          // Named by the name it was saved under, which a rename leaves until it saves (MB.115).
          heading={{ eyebrow: `Edit ${label}`, title: edited.group.name }}
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
