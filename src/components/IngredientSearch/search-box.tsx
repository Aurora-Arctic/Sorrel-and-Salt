'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactElement, useId, useMemo, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH } from '@/modules/ingredients/validation/compendium-filter';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import Combobox from '../Combobox';
import { MagnifierIcon } from '../Field/icons';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import { useApplyFilter } from '../FilterForm';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import type { IngredientSearchBoxProps, IngredientSearchOption } from './types';
import './index.scss';

// The search row's first control (M8.10): a type-ahead over the compendium's
// ranked search, with the magnifier at the start of its box as the form's one submit. The
// debounced text asks `compendium(query:, first: 25)` for the dropdown; the
// list itself changes only on Enter, the clear, a pick or See All Results
// (claude-docs/components/ingredient-search.md).

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

/** The dropdown's rows: the first page of the ranked search, never a second. */
const MATCH_ROWS = 25;

/** Whether `text` is long enough to search, counted in composed code points as the service counts it. */
const searchable = (text: string): boolean =>
  Array.from(text.normalize('NFC')).length >= MIN_QUERY_LENGTH;

const IngredientSearchBox = ({
  text,
  onText,
  searchHref,
  pickHref,
  pickHeading,
}: IngredientSearchBoxProps): ReactElement => {
  const field = fieldDescription({ id: useId() });
  const input = useRef<HTMLInputElement>(null);
  const apply = useApplyFilter();
  const router = useRouter();
  const modal = useRouteModalOpener();
  // Nothing is asked until the box has been focused, so opening the page
  // sends nothing.
  const [active, setActive] = useState(false);

  const query = useDebouncedValue(text.trim());
  const searchesNow = searchable(query);
  const { data, isFetching } = useQuery({
    ...graphqlQuery(IngredientSearchMatchesDocument, { query, first: MATCH_ROWS }),
    enabled: active && searchesNow,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });

  // Under the floor the service ignores the query and returns the unranked
  // browse list, so no rows are offered, and the kept previous answer is not
  // shown either.
  const options = useMemo(
    (): IngredientSearchOption[] =>
      searchesNow && data
        ? data.compendium.edges.map(({ node }) => ({
            key: node.id,
            value: node.name,
            label: node.canonicalName ? `${node.name} (${node.canonicalName})` : node.name,
            match: node,
          }))
        : [],
    [data, searchesNow],
  );
  const hasMore = searchesNow && data?.compendium.pageInfo.hasNextPage === true;
  const seeAllHref = searchHref(query);

  // A pick opens the entry over the list as it stands, so the list is
  // neither applied to nor greyed: `router.push` outside the frame's
  // transition leaves the frame's `pending` false, where the frame's own
  // `go` would swap the list for its skeleton. Given a heading, the route
  // modal's opener shows the dialog at once while its page loads, as the
  // list's Edit link does.
  function pick(_value: string, option: IngredientSearchOption | null) {
    if (!option) return;
    const href = pickHref(option.match);
    if (modal && pickHeading) modal.open(href, pickHeading(option.match));
    else router.push(href);
  }

  function seeAll(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    apply(seeAllHref);
  }

  return (
    <FieldShell label="Name" {...field}>
      <Combobox<IngredientSearchOption>
        id={field.controlId}
        label="Name"
        labelId={field.labelId}
        name="query"
        value={text}
        onChange={onText}
        onFocus={() => setActive(true)}
        onPick={pick}
        // Enter with the dropdown open and no row highlighted would only
        // close it; it applies the text, as a closed box does through the form.
        onCommit={(value) => apply(searchHref(value.trim()))}
        suggestions={{ options, pending: text.trim() !== query || isFetching }}
        empty={searchesNow ? 'No Matches' : undefined}
        footer={
          hasMore ? (
            <a href={seeAllHref} onClick={seeAll}>
              See All Results
            </a>
          ) : undefined
        }
        offerTyped={false}
        noun="result"
        placeholder="Search names"
        inputRef={input}
        // The clear empties the box and applies the empty search (the owner's
        // call), so the list drops its name filter and keeps the others.
        clear={{
          label: 'Clear Name',
          onClear: () => {
            onText('');
            input.current?.focus();
            apply(searchHref(''));
          },
          empty: text === '',
        }}
        // No chevron: a free-text search opens as you type, and the magnifier submits,
        // as a search field's does.
        toggle={false}
        leading={
          // The form's one submit, as SearchField's was, at the start of the box:
          // Enter in the closed box reaches it too, and before hydration it
          // sends the whole form. Its own id lets FilterForm give it the focus back.
          <button id={`${field.controlId}-submit`} type="submit" className="combobox__indicator">
            <MagnifierIcon />
            <span className="visually-hidden">Search</span>
          </button>
        }
      />
    </FieldShell>
  );
};

export default IngredientSearchBox;
