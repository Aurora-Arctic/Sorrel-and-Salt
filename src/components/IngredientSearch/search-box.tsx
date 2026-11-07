'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH } from '@/modules/ingredients/validation/compendium-filter';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import Combobox from '../Combobox';
import { UNTITLED_SPELL } from '../SpellCard';
import { MagnifierIcon } from '../Field/icons';
import { useApplyFilter } from '../FilterForm';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import type {
  IngredientSearchBoxProps,
  IngredientSearchMatch,
  IngredientSearchOption,
} from './types';
import './index.scss';

const IngredientSearchMatchesDocument = graphql(`
  query IngredientSearchMatches($query: String, $first: Int) {
    compendium(query: $query, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          slug
          name
          canonicalName
          nomenclature
        }
      }
    }
  }
`);

// The same type-ahead over one coven's own ingredients: its entries and the compendium entries its
// cupboard names, shown by the coven's label. Asked for a cupboard `source`, never beside
// another's.
const IngredientSearchCupboardMatchesDocument = graphql(`
  query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {
    workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          slug
          name
          canonicalName
          nomenclature
          cupboardEntry(workspaceId: $workspaceId) {
            label
          }
        }
      }
    }
  }
`);

const GrimoireSearchMatchesDocument = graphql(`
  query GrimoireSearchMatches(
    $workspaceId: ID!
    $query: String
    $status: SpellStatus
    $first: Int
  ) {
    grimoire(workspaceId: $workspaceId, query: $query, status: $status, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          title
        }
      }
    }
  }
`);

const WORDING = {
  ingredient: {
    label: 'Name',
    placeholder: 'Search',
    clear: 'Clear Name',
  },
  spell: { label: 'Title', placeholder: 'Search', clear: 'Clear Title' },
} as const;

/** The dropdown's rows: the first page of the ranked search, never a second. */
const MATCH_ROWS = 25;

/** Whether `text` is long enough to search, counted in composed code points as the
 * service counts it. */
const searchable = (text: string): boolean =>
  Array.from(text.normalize('NFC')).length >= MIN_QUERY_LENGTH;

const ingredientRow = ({
  id,
  slug,
  name,
  canonicalName,
  nomenclature,
}: IngredientSearchMatch): IngredientSearchOption => ({
  key: id,
  value: name,
  label: canonicalName ? `${name} (${canonicalName})` : name,
  match: { id, slug, name, canonicalName, nomenclature },
});

const IngredientSearchBox = ({
  text,
  onText,
  searchHref,
  pickHref,
  pickHeading,
  pickPlace,
  source = { kind: 'compendium' },
}: IngredientSearchBoxProps): ReactElement => {
  const wording = source.kind === 'grimoire' ? WORDING.spell : WORDING.ingredient;
  const workspaceId = source.kind === 'compendium' ? '' : source.workspaceId;
  const controlId = useId();
  const input = useRef<HTMLInputElement>(null);
  const apply = useApplyFilter();
  const { navigate } = usePendingNavigation();
  const modal = useRouteModalOpener();
  // Nothing is asked until the box has been focused, so opening the page sends nothing.
  const [active, setActive] = useState(false);

  const query = useDebouncedValue(text.trim());
  const searchesNow = searchable(query);
  // Text under the floor is never asked about, so the dropdown says to keep typing at once.
  const belowFloor = text.trim() !== '' && !searchable(text.trim());
  const compendium = useQuery({
    ...graphqlQuery(IngredientSearchMatchesDocument, { query, first: MATCH_ROWS }),
    enabled: active && searchesNow && source.kind === 'compendium',
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const cupboard = useQuery({
    ...graphqlQuery(IngredientSearchCupboardMatchesDocument, {
      workspaceId,
      query,
      first: MATCH_ROWS,
    }),
    enabled: active && searchesNow && source.kind === 'cupboard',
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const status = source.kind === 'grimoire' ? source.status : undefined;
  const grimoire = useQuery({
    ...graphqlQuery(GrimoireSearchMatchesDocument, {
      workspaceId,
      query,
      status,
      first: MATCH_ROWS,
    }),
    enabled: active && searchesNow && source.kind === 'grimoire',
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const isFetching = { compendium, cupboard, grimoire }[source.kind].isFetching;
  // A spell's match holds its id as both `id` and `slug` (it has no slug), for the recipe page a
  // pick opens; the coven's label stands in for an ingredient's name.
  const answer = useMemo((): { hasNextPage: boolean; rows: IngredientSearchOption[] } | null => {
    if (source.kind === 'grimoire') {
      const page = grimoire.data?.grimoire;
      return page
        ? {
            hasNextPage: page.pageInfo.hasNextPage,
            rows: page.edges.map(({ node }) => ({
              key: node.id,
              value: node.title?.trim() || query,
              label: node.title?.trim() || UNTITLED_SPELL,
              match: {
                id: node.id,
                slug: node.id,
                name: node.title?.trim() || UNTITLED_SPELL,
                canonicalName: null,
                nomenclature: 'none',
              },
            })),
          }
        : null;
    }
    if (source.kind === 'cupboard') {
      const page = cupboard.data?.workspaceIngredients;
      return page
        ? {
            hasNextPage: page.pageInfo.hasNextPage,
            rows: page.edges.map(({ node }) =>
              ingredientRow({ ...node, name: node.cupboardEntry?.label ?? node.name }),
            ),
          }
        : null;
    }
    const page = compendium.data?.compendium;
    return page
      ? {
          hasNextPage: page.pageInfo.hasNextPage,
          rows: page.edges.map(({ node }) => ingredientRow(node)),
        }
      : null;
  }, [source.kind, query, grimoire.data, cupboard.data, compendium.data]);

  // Under the floor the service ignores the query and returns the unranked browse list, so no
  // rows are offered and the kept previous answer is not shown either.
  const options = useMemo(
    (): IngredientSearchOption[] => (searchesNow && !belowFloor && answer ? answer.rows : []),
    [answer, searchesNow, belowFloor],
  );
  const hasMore = searchesNow && !belowFloor && answer?.hasNextPage === true;
  const seeAllHref = searchHref(query);

  // A pick opens the entry over the list as it stands: the hook's own transition leaves the frame's
  // `pending` false, where its `go` would swap the list for its skeleton. Given a heading, the opener
  // shows the dialog at once while its page loads.
  function pick(_value: string, option: IngredientSearchOption | null) {
    if (!option) return;
    if (!pickHref || !option.match) {
      apply(searchHref(option.value.trim()));
      return;
    }
    const href = pickHref(option.match);
    if (modal && pickHeading) modal.open(href, pickHeading(option.match), pickPlace);
    else {
      const target = ingredientLinkTarget(href);
      navigate(href, target ? { target } : {});
    }
  }

  return (
    // No visible label: the placeholder says what the box is for, and the combobox draws its
    // own visually hidden one, so no FieldShell here.
    <Combobox<IngredientSearchOption>
      id={controlId}
      label={wording.label}
      name="query"
      value={text}
      onChange={onText}
      onFocus={() => setActive(true)}
      onPick={pick}
      onCommit={(value) => apply(searchHref(value.trim()))}
      suggestions={{
        options,
        pending: !belowFloor && (text.trim() !== query || isFetching),
      }}
      empty={belowFloor ? 'Keep typing to search' : searchesNow ? undefined : false}
      // The last row of the listbox, reached by the arrows like a result, in italics so it reads
      // apart from the matches.
      action={hasMore ? { label: 'See All Results', onSelect: () => apply(seeAllHref) } : undefined}
      offerTyped={false}
      noun="result"
      placeholder={wording.placeholder}
      inputRef={input}
      // The clear empties the box and applies the empty search, so the list drops its name filter
      // and keeps the others.
      clear={{
        label: wording.clear,
        onClear: () => {
          onText('');
          input.current?.focus();
          apply(searchHref(''));
        },
        empty: text === '',
      }}
      toggle={false}
      leading={
        // The form's one submit, as SearchField's was, at the start of the box:
        // Enter in the closed box reaches it too, and before hydration it
        // sends the whole form. Its own id lets FilterForm give it the focus back.
        <button id={`${controlId}-submit`} type="submit" className="combobox__indicator">
          <MagnifierIcon />
          <span className="visually-hidden">Search</span>
        </button>
      }
    />
  );
};

export default IngredientSearchBox;
