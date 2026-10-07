'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, type MouseEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { TextField } from './fields';
import type { Duplicate, DuplicateWarning, NameFieldProps } from './types';

// Story 16's "did you mean": the name asks MB.11's possibleDuplicates once
// the typing settles, on the debounce the other lookups wait on, and each
// near match is named beneath the field by its label and formal name, linked
// to its entry. It has to be answered: a save asks about the very name it is
// sending, settled or not, and while a match shows the save is held, the
// warning turns to an error on the name, and the focus goes to Create
// Anyway, which sets the matches aside so the next save goes
// (claude-docs/components/ingredient-form.md, "The duplicate warning").

const PossibleDuplicatesDocument = graphql(`
  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {
    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          slug
        }
      }
    }
  }
`);

/** Matches a warning names: the closest few, best first, as a sentence can hold them. */
const DUPLICATE_ROWS = 3;

const lookup = (workspaceId: string | null, name: string) =>
  graphqlQuery(PossibleDuplicatesDocument, { workspaceId, name, first: DUPLICATE_ROWS });

/**
 * The warning for the name as typed: the matches it shows, whether a save is
 * held on them, and the two things that move it on — a save's `check`, and
 * `dismiss`. The form owns it, since its save waits on it; `NameField` draws it.
 * A null coven asks about the compendium alone, and `omit` is the entry being
 * edited, which its own name always matches.
 */
export function useDuplicateWarning(
  workspaceId: string | null,
  text: string,
  omit?: string,
): DuplicateWarning {
  const client = useQueryClient();
  const typed = text.trim();
  const name = useDebouncedValue(typed);
  const { data } = useQuery({
    ...lookup(workspaceId, name),
    // A blank name has nothing to resemble, and the server answers it empty.
    enabled: name !== '',
    placeholderData: keepPreviousData,
    // A lookup that fails warns of nothing; it never takes the form down.
    throwOnError: false,
  });
  // By id rather than by name: a longer name finding the same entries warns
  // of nothing new, and one finding a new entry does.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  // The name a save was held on. Another name lifts the hold, so a match
  // arriving as it is typed never takes the focus; its save asks again.
  const [heldFor, setHeldFor] = useState<string | null>(null);
  const matches =
    name === ''
      ? []
      : (data?.possibleDuplicates.edges.flatMap(({ node }) => (node.id === omit ? [] : node)) ??
        []);
  const shown = matches.filter((match) => !dismissed.has(match.id));

  const check = async (value: string): Promise<boolean> => {
    const sending = value.trim();
    if (sending === '') return false;
    let found: Duplicate[];
    try {
      // The cached answer when the typing had settled; asked now when not, and
      // the field shows it once the debounce catches up, from the cache.
      const answer = await client.fetchQuery(lookup(workspaceId, sending));
      found = answer.possibleDuplicates.edges.flatMap(({ node }) => (node.id === omit ? [] : node));
    } catch {
      // As the field's own lookup: a failure warns of nothing, and holds nothing.
      return false;
    }
    const holds = found.some((match) => !dismissed.has(match.id));
    if (holds) setHeldFor(sending);
    return holds;
  };

  const dismiss = () => {
    setDismissed(new Set([...dismissed, ...shown.map((match) => match.id)]));
    setHeldFor(null);
  };

  return { shown, blocking: heldFor === typed && shown.length > 0, check, dismiss };
}

/** "Cat's Claw (Uncaria tomentosa)": the label alone names five plants. */
const titleOf = ({ name, canonicalName }: Duplicate) =>
  canonicalName ? `${name} (${canonicalName})` : name;

/** What goes before the match at `index` of `count`: "A, B or C". */
const joinerAt = (index: number, count: number) => {
  if (index === 0) return '';
  return index === count - 1 ? ' or ' : ', ';
};

/** A match's page, as a coven's form links it: the ingredient by id, M8.19's. */
const covenHref = ({ id }: Duplicate) => `/ingredients/${id}`;

/** The name field, with the duplicate warning beneath it. */
export function NameField({ warning, hrefOf = covenHref, ref }: NameFieldProps): ReactElement {
  const { shown, blocking } = warning;
  const warningId = useId();

  const dismiss = (event: MouseEvent<HTMLButtonElement>) => {
    // The pressed button is about to go, so the name takes the focus first:
    // through the form at once, where setFocus would wait a tick on the body.
    const field = event.currentTarget.form?.elements.namedItem('name');
    if (field instanceof HTMLInputElement) field.focus();
    warning.dismiss();
  };

  return (
    <TextField
      name="name"
      label="Name"
      autoComplete="off"
      required
      hint="What this coven calls it. It can differ from the formal name."
      describedBy={shown.length > 0 ? warningId : undefined}
      invalid={blocking}
      after={
        // Always in the page, as a live region must be to be heard: the
        // warning arrives after the typing, and nothing else says so.
        <output className="ingredient-form__duplicates" aria-label="Possible duplicates">
          {shown.length > 0 && (
            <div className={blocking ? 'notice notice--error' : 'notice'}>
              {/* Plain anchors rather than <Link>: typed routes refuse a page
                  not built yet, and /ingredients/[id] is M8.19's. */}
              <p id={warningId}>
                Did you mean{' '}
                {shown.map((match, index) => (
                  <Fragment key={match.id}>
                    {joinerAt(index, shown.length)}
                    <a href={hrefOf(match)}>{titleOf(match)}</a>
                  </Fragment>
                ))}
                ?
              </p>
              {/* Described by the warning: a save that stops here moves the
                  focus to it, and the focus should say why. */}
              <button
                ref={ref}
                type="button"
                className="btn"
                aria-describedby={warningId}
                onClick={dismiss}
              >
                Create Anyway
              </button>
            </div>
          )}
        </output>
      }
    />
  );
}
