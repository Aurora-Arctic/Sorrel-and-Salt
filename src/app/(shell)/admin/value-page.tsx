import { formLabel } from '@/modules/ingredients/validation/form-label';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupedValueKind } from '../../../components/GroupedValueForm/types';
import GroupedValueList from '../../../components/GroupedValueList';
import { groupedValuesHref } from '../../../components/GroupedValueList/href';
import { KINDS } from '../../../components/GroupedValueList/kinds';
import type { GroupedValueListEntry } from '../../../components/GroupedValueList/types';
import { resolveNumberedPage } from '../../../lib/pagination';
import { requireCuratorSession } from '../../../lib/request-session';
import { single } from '../../../lib/search-params';
import { editorStamps } from './editors';
import AddAction from './add-action';
import { pagerHrefs } from '../../../lib/list-href';
import { readEditPlace, readListPlace } from './list-page';
import MissingNotice from './missing-notice';
import ValueDialog from './value-dialog';
import { VALUE_KINDS } from './value-kinds';
import type { ModalHeading } from '../../../components/Modal/types';
import type { ValueGroupRow, ValuePageProps, ValueRow, ValueSearchParams } from './types';

// The page every curated value vocabulary shares: the categories, forms and deities, each filed
// under a group, and the celestial bodies and zodiac signs, filed under nothing. Each route's
// `page.tsx` keeps its `metadata` and hands its kind and address here; the heading and tabs are its
// route group's layout's. The page and GraphQL's lists end at the same services, paged by the same
// helper (rules 1 and 8); the writes are the modal's, through the kind's mutations.

// One page of the kind under the filter, with "Page X of Y" counted from its
// first row (src/lib/pagination.ts). Cached so a second render in the request
// reads once, and so keyed by primitives rather than a filter object.
const readValues = cache(
  (
    kind: GroupedValueKind,
    query: string,
    groupId: string | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const { list, count } = VALUE_KINDS[kind];
    const filter = { query: query || undefined, groupId };
    return resolveNumberedPage(
      { after, before },
      (request) => list(filter, request),
      (start) => count(filter, start),
    );
  },
);

/**
 * Where the address puts the list: its filter, cursor and modal, and the kind's groups. A group
 * slug is resolved against the (cached) groups, and only a group that exists is kept in the
 * filter, so an unknown slug leaves every link, as a hand-edited cursor gets the first page.
 */
async function readPlace(kind: GroupedValueKind, params: ValueSearchParams) {
  const { query, after, before, editSlug, adding } = readListPlace(params);
  const groupSpec = KINDS[kind].group;
  // Blank is no filter: a native submit sends `group=`.
  const groupParam = groupSpec?.param === 'tradition' ? params.tradition : params.group;
  const groupSlug = groupSpec ? single(groupParam) || undefined : undefined;
  const groups = (await VALUE_KINDS[kind].readGroups?.()) ?? [];
  const group = groupSlug ? groups.find((each) => each.slug === groupSlug) : undefined;
  const filter = { query, group: group?.slug ?? '' };
  return {
    filter,
    here: { ...filter, after, before },
    after,
    before,
    editSlug,
    adding,
    groups,
    group,
  };
}

/**
 * A value's edit dialog head: the name it was saved under, not the Name field's, and a deity's
 * tradition after it ("Hecate (Greek)"), since two traditions may share a deity's name. A
 * category's or a form's group is where it is filed, not part of its name.
 */
function editHeading(
  kind: GroupedValueKind,
  { name, groupId }: Pick<ValueRow, 'name' | 'groupId'>,
  groupsById: ReadonlyMap<string, ValueGroupRow>,
): ModalHeading {
  const tradition = kind === 'deity' && groupId ? groupsById.get(groupId)?.name : undefined;
  return {
    eyebrow: `Edit ${KINDS[kind].label}`,
    title: kind === 'form' ? formLabel(name) : name,
    qualifier: tradition,
  };
}

/**
 * The kind's Add, the open tab's action beside the page's heading: its route group's `@action`
 * slot renders it, so it changes with the tab (claude-docs/components/tabbed-page.md). It keeps the
 * list's filter and cursor, as every link on the page does.
 */
export async function ValueAction({ kind, searchParams }: ValuePageProps): Promise<ReactElement> {
  await requireCuratorSession();
  const { here } = await readPlace(kind, await searchParams);
  const title = `Add ${KINDS[kind].label}`;
  return (
    <AddAction href={groupedValuesHref(kind, here, 'new')} heading={{ title }}>
      {title}
    </AddAction>
  );
}

/**
 * A curated vocabulary, for an admin to add to, edit and retire. A modal over the list does the
 * writing, opened by `?new` or `?edit=<slug>` so it can be linked to and Back closes it. The list
 * narrows by `?query=` and a grouped kind's group, which every link keeps
 * (claude-docs/components/grouped-value-form.md, "On the admin pages").
 */
export async function ValuePage({ kind, searchParams }: ValuePageProps): Promise<ReactElement> {
  const session = await requireCuratorSession();
  const place = await readPlace(kind, await searchParams);
  const { filter, here, after, before, adding, groups, group } = place;
  const { label, noun } = KINDS[kind];

  const [page, { edited, missing }] = await Promise.all([
    readValues(kind, filter.query, group?.id, after, before),
    readEditPlace(place, VALUE_KINDS[kind].getBySlug),
  ]);
  const groupsById = new Map(groups.map((each) => [each.id, each]));
  const stamps = await editorStamps(
    session,
    page.edges.map(({ node }) => node),
  );
  const values = page.edges.map(({ node }, i): GroupedValueListEntry => {
    const own = node.groupId ? groupsById.get(node.groupId) : undefined;
    return {
      ...stamps[i],
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      otherNames: node.otherNames,
      groupName: own?.name ?? '',
      // A chip only for a group with a pair: a category's.
      groupColors:
        own?.colorDark && own.colorLight
          ? { colorDark: own.colorDark, colorLight: own.colorLight }
          : undefined,
      groupIcon: own?.icon,
      editHref: groupedValuesHref(kind, here, { edit: node.slug }),
      editHeading: editHeading(kind, node, groupsById),
    };
  });
  const closeHref = groupedValuesHref(kind, here);
  const choices = groups.map(({ id, name, icon }) => ({ id, name, icon }));

  return (
    <>
      {missing && <MissingNotice noun={noun} />}
      <GroupedValueList
        kind={kind}
        values={values}
        filter={filter}
        groups={groups.map(({ slug, name }) => ({ slug, name }))}
        position={page.position}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          groupedValuesHref(kind, { ...filter, ...cursor }),
        )}
      />
      {/* One dialog in one place for an add and an edit alike, rendered
          whatever the address opens, so a press opens it at once and its form
          arrives in it (M9.18). */}
      <ValueDialog
        kind={kind}
        closeHref={closeHref}
        opened={
          adding
            ? { heading: { title: `Add ${label}` } }
            : edited && {
                heading: editHeading(kind, edited, groupsById),
                value: {
                  id: edited.id,
                  name: edited.name,
                  description: edited.description,
                  groupId: edited.groupId,
                  otherNames: edited.otherNames,
                },
              }
        }
        groups={choices}
      />
    </>
  );
}
