import 'server-only';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupKind } from '../../../components/GroupForm/types';
import GroupList from '../../../components/GroupList';
import { groupsHref } from '../../../components/GroupList/href';
import { KINDS } from '../../../components/GroupList/kinds';
import type { GroupListEntry } from '../../../components/GroupList/types';
import { resolveNumberedPage } from '../../../lib/pagination';
import { requireCuratorSession } from '../../../lib/request-session';
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
import { editorStamps } from './editors';
import AddAction from './add-action';
import { pagerHrefs } from '../../../lib/list-href';
import { readEditPlace, readListPlace } from './list-page';
import MissingNotice from './missing-notice';
import type { ModalHeading } from '../../../components/Modal/types';
import type { GroupKindPage, GroupPageProps, GroupSearchParams } from './types';

// The page every group vocabulary shares: category groups, form groups and deity traditions. Each
// route's `page.tsx` keeps its `metadata` and hands its kind here. Read through the services and
// paged by the cursor helper (rules 1 and 8); only a kind with `search` narrows by `?query=`.

/** What tells one group page from another: its copy and readers. A kind without search gets no filter. */
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

// One page of the kind's groups under the search, "Page X of Y" beside it, counted from the page's
// first row (src/lib/pagination.ts). Cached so a second render in the request reads once, and so
// keyed by primitives rather than a filter object.
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

/** Where the address puts the list: search, cursor and modal. A kind without search reads no `?query=`. */
function readPlace(kind: GroupKind, params: GroupSearchParams) {
  const { query, after, before, editSlug, adding } = readListPlace(params);
  const shown = GROUP_KINDS[kind].search ? query : '';
  return { query: shown, here: { query: shown, after, before }, editSlug, adding };
}

// Every group on one page of the maximum, for the delete's move picker and, for a category group,
// the colour pickers' near-colour warning: an admin adds a group rarely.
// The curated kind's own read of its groups, which its page shares (`group-readers.ts`).
const readChoices = (kind: GroupKind) => GROUP_READERS[KINDS[kind].holds]();

/** The group `?edit=` names, and how many live rows it holds, which its delete must move. */
async function readGroup(kind: GroupKind, slug: string) {
  const group = await GROUP_KINDS[kind].getBySlug(slug);
  return { group, memberCount: await GROUP_KINDS[kind].countMembers(group.id) };
}

/** A group's edit dialog head: the name it was saved under, under the kind. */
function editHeading(kind: GroupKind, name: string): ModalHeading {
  return { eyebrow: `Edit ${KINDS[kind].label}`, title: name };
}

/**
 * The kind's Add, the open tab's action: its route group's `@action` slot renders it
 * (claude-docs/components/tabbed-page.md). It keeps the list's search and cursor.
 */
export async function GroupAction({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  await requireCuratorSession();
  const { here } = readPlace(kind, await searchParams);
  const { add, label } = KINDS[kind];
  return (
    <AddAction href={groupsHref(kind, here, 'new')} heading={{ title: `Add ${label}` }}>
      {add}
    </AddAction>
  );
}

/**
 * A group vocabulary to add to, edit and retire. A modal over the list does the writing, opened by
 * `?new` or `?edit=<slug>` (claude-docs/components/group-form.md, "On the admin pages").
 */
export async function GroupPage({ kind, searchParams }: GroupPageProps): Promise<ReactElement> {
  const session = await requireCuratorSession();
  const place = readPlace(kind, await searchParams);
  const { query, here, adding } = place;
  const { noun, label } = KINDS[kind];
  const { search } = GROUP_KINDS[kind];

  const [page, choices, { edited, missing }] = await Promise.all([
    readPage(kind, query, here.after, here.before),
    readChoices(kind),
    readEditPlace(place, (slug) => readGroup(kind, slug)),
  ]);
  const stamps = await editorStamps(
    session,
    page.edges.map(({ node }) => node),
  );
  const groups = page.edges.map(({ node }, i): GroupListEntry => ({
    ...stamps[i],
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    colorDark: node.colorDark,
    colorLight: node.colorLight,
    icon: node.icon,
    editHref: groupsHref(kind, here, { edit: node.slug }),
    editHeading: editHeading(kind, node.name),
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
      {/* One dialog in one place for an add and an edit alike, rendered
          whatever the address opens, so a press opens it at once and its form
          arrives in it. */}
      <GroupDialog
        kind={kind}
        closeHref={closeHref}
        opened={
          adding
            ? { heading: { title: `Add ${label}` } }
            : edited && {
                heading: editHeading(kind, edited.group.name),
                group: {
                  id: edited.group.id,
                  name: edited.group.name,
                  description: edited.group.description,
                  // A form group's and a tradition's are `''`: they have none.
                  colorDark: edited.group.colorDark ?? '',
                  colorLight: edited.group.colorLight ?? '',
                  icon: edited.group.icon ?? '',
                },
                memberCount: edited.memberCount,
              }
        }
        groups={choices}
      />
    </>
  );
}
