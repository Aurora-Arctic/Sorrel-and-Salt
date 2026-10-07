'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useState, useTransition } from 'react';
import { vocabularyHref } from './href';
import { VOCABULARY_COPY } from './vocabularies';
import type { VocabularyValueListFilterProps } from './types';

// The name filter, a GET form to the page itself: the forms' filter
// (MB.178, M5.6a) without its group, since a flat vocabulary has none.
// Filter is offered only when the query differs from the one the page shows,
// and opens the new one from the first page as a soft navigation inside a
// transition, so Filter shows the spinner until the filtered list arrives.
// The list keys this by the query shown, so a page showing another — Back,
// say — starts it again from that one.
const VocabularyValueListFilter = ({
  vocabulary,
  query,
}: VocabularyValueListFilterProps): ReactElement => {
  const id = useId();
  const { path, plural } = VOCABULARY_COPY[vocabulary];
  const [draft, setDraft] = useState(query);
  const [filtering, startFiltering] = useTransition();
  const router = useRouter();
  const changed = draft.trim() !== query;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || filtering) return;
    startFiltering(() => {
      router.push(vocabularyHref(vocabulary, { query: draft.trim() }));
    });
  }

  return (
    <search>
      <form
        className="vocabulary-value-list__search"
        method="get"
        action={path}
        aria-label={`Filter ${plural}`}
        onSubmit={submit}
      >
        <div className="field">
          <label className="field__label" htmlFor={`${id}-query`}>
            Name
          </label>
          <input
            id={`${id}-query`}
            className="input"
            type="search"
            name="query"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button
          className="btn btn--solid"
          type="submit"
          disabled={!changed || filtering}
          aria-busy={filtering || undefined}
        >
          {filtering && <span className="spinner" aria-hidden="true" />}
          {filtering ? 'Filtering' : 'Filter'}
        </button>
      </form>
    </search>
  );
};

export default VocabularyValueListFilter;
