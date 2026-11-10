import 'server-only';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupKind } from '../../../components/GroupForm/types';
import GroupList from '../../../components/GroupList';
import { groupsHref } from '../../../components/GroupList/href';
import { KINDS } from '../../../components/GroupList/kinds';
import type { GroupListEntry } from '../../../components/GroupList/types';
import { readNumberedPage } from '../../../lib/numbered-page';
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
import AddAction from '@/app/(shell)/_admin/add-action';
import { pagerHrefs } from '../../../lib/list-href';
import { readEditPlace, readListPlace } from '@/app/(shell)/_admin/list-page';
import MissingNotice from '@/app/(shell)/_admin/missing-notice';
import type { ModalHeading } from '../../../components/Modal/types';
import type { GroupKindPage, GroupPageProps, GroupSearchParams } from './types';

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
    const filter = query ? { query } : undefined;
    return readNumberedPage(
      { after, before },
      (request) => list(request, filter),
      (start) => count(start, filter),
    );
  },
);

function readPlace(kind: GroupKind, params: GroupSearchParams) {
  const { query, after, before, editSlug, adding } = readListPlace(params);
  const shown = GROUP_KINDS[kind].search ? query : '';
  return { query: shown, here: { query: shown, after, before }, editSlug, adding };
}

// One page of the maximum holds every group: a keeper adds a group rarely.
const readChoices = (kind: GroupKind) => GROUP_READERS[KINDS[kind].holds]();

async function readGroup(kind: GroupKind, slug: string) {
  const group = await GROUP_KINDS[kind].getBySlug(slug);
  return { group, memberCount: await GROUP_KINDS[kind].countMembers(group.id) };
}

function editHeading(kind: GroupKind, name: string): ModalHeading {
  return { eyebrow: `Edit ${KINDS[kind].label}`, title: name };
}

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
 * `?new` or `?edit=<slug>` (claude-docs/components/group-form.md, "Contracts").
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
