'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, type MouseEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { TextField } from '../Field';
import type { Duplicate, DuplicateWarning, IngredientFormValues, NameFieldProps } from './types';

// Story 16's "did you mean": the name asks MB.11's possibleDuplicates once
// the typing settles, on the debounce the other lookups wait on, and each
// near match is named beneath the field by its label and formal name, linked
// to its entry. It has to be answered: a save asks about the very name it is
// sending, settled or not, and while a match shows the save is held, the
// warning turns to an error on the name, and the focus goes to Create
// Anyway, which sets the matches aside so the next save goes. An edit's
// warning only names the matches: renaming makes nothing new, so its save
// is never held and it offers no Create Anyway (MB.115, the owner's call)
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
          isGlobal
          inCupboard(workspaceId: $workspaceId)
        }
      }
    }
  }
`);

// The compendium entries whose name is the typed one exactly (M12.20): asked
// when a save is sent, since only a save is held on the answer.
const CompendiumMatchesDocument = graphql(`
  query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {
    compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          slug
          isGlobal
          inCupboard(workspaceId: $workspaceId)
        }
      }
    }
  }
`);

/** Exact matches a question names: more than a handful of one name is not a choice a person makes. */
const EXACT_ROWS = 5;

/** Matches a warning names: the closest few, best first, as a sentence can hold them. */
const DUPLICATE_ROWS = 3;

const lookup = (workspaceId: string | null, name: string) =>
  graphqlQuery(PossibleDuplicatesDocument, { workspaceId, name, first: DUPLICATE_ROWS });

/**
 * The warning for the name as typed: the matches it shows, whether a save is
 * held on them, and the two things that move it on — a save's `check`, and
 * `dismiss`. The form owns it, since its save waits on it; `NameField` draws it.
 * A null coven asks about the compendium alone, and `omit` is the entry being
 * edited, which its own name always matches. `opened` is the name the form
 * opened with: until the name has been typed in, nothing is asked or held, so
 * an edit that leaves the name alone never warns; once typed in, it asks as
 * any name does, back at the opened name too (MB.115, the owner's calls).
 */
export function useDuplicateWarning(
  workspaceId: string | null,
  text: string,
  omit?: string,
  opened = '',
): DuplicateWarning {
  const client = useQueryClient();
  const typed = text.trim();
  // Typed in since the form opened, or since a save moved `opened` on: set
  // during render, as React allows for a component's own state, so the first
  // keystroke already asks.
  const [baseline, setBaseline] = useState(opened);
  const [edited, setEdited] = useState(false);
  if (baseline !== opened) {
    setBaseline(opened);
    setEdited(false);
  } else if (!edited && typed !== opened.trim()) {
    setEdited(true);
  }
  const untouched = !edited && typed === opened.trim();
  // The untouched name asks nothing, as a blank one does.
  const name = useDebouncedValue(untouched ? '' : typed);
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
  // The compendium entries named exactly as the held save's name (M12.20).
  const [exact, setExact] = useState<Duplicate[]>([]);
  const matches =
    name === ''
      ? []
      : (data?.possibleDuplicates.edges.flatMap(({ node }) => (node.id === omit ? [] : node)) ??
        []);
  const shown = matches.filter((match) => !dismissed.has(match.id));

  const check = async (value: string): Promise<boolean> => {
    const sending = value.trim();
    if (sending === '' || (!edited && sending === opened.trim())) return false;
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
    // A coven's save asks which compendium entries bear the name exactly; the
    // compendium's own has no cupboard to put one in. A failure asks no question.
    let same: Duplicate[] = [];
    if (workspaceId !== null) {
      try {
        const answer = await client.fetchQuery(
          graphqlQuery(CompendiumMatchesDocument, {
            workspaceId,
            name: sending,
            first: EXACT_ROWS,
          }),
        );
        same = answer.compendiumMatches.edges
          .map(({ node }) => node)
          .filter((match) => !dismissed.has(match.id));
      } catch {
        same = [];
      }
    }
    const holds = same.length > 0 || found.some((match) => !dismissed.has(match.id));
    if (holds) {
      setExact(same);
      setHeldFor(sending);
    }
    return holds;
  };

  const dismiss = () => {
    setDismissed(
      new Set([...dismissed, ...shown.map((match) => match.id), ...exact.map((match) => match.id)]),
    );
    setHeldFor(null);
    setExact([]);
  };

  return {
    shown: untouched ? [] : shown,
    blocking: !untouched && heldFor === typed && shown.length > 0,
    exact: !untouched && heldFor === typed ? exact : [],
    check,
    dismiss,
  };
}

/** "Cat's Claw (Uncaria tomentosa)": the label alone names five plants. */
const titleOf = ({ name, canonicalName }: Duplicate) =>
  canonicalName ? `${name} (${canonicalName})` : name;

/** What goes before the match at `index` of `count`: "A, B or C". */
const joinerAt = (index: number, count: number) => {
  if (index === 0) return '';
  return index === count - 1 ? ' or ' : ', ';
};

/** The name field, with the duplicate warning beneath it. */
export function NameField({
  warning,
  hrefOf,
  onUse,
  holds = true,
  ref,
}: NameFieldProps): ReactElement {
  const { shown, blocking, exact } = warning;
  // The save is held on a compendium entry of the very name typed: a question
  // rather than a warning, answered by using the entry or adding our own.
  const asking = blocking && exact.length > 0;
  const warningId = useId();

  /**
   * What a compendium match offers: Use It, which puts it in the cupboard, or
   * Open It, its coven page, once the cupboard holds it. Nothing for a coven's
   * own entry, or where no cupboard is to be put into (the admin's).
   */
  const choiceFor = (match: Duplicate, beside = false): ReactElement | null => {
    if (!onUse || !match.isGlobal) return null;
    const name = <span className="visually-hidden"> {titleOf(match)}</span>;
    const mark = beside ? ' ' : '';
    return match.inCupboard ? (
      <>
        {mark}
        <a className="btn btn--quiet btn--small" href={hrefOf(match)}>
          Open It{name}
        </a>
      </>
    ) : (
      <>
        {mark}
        <button type="button" className="btn btn--quiet btn--small" onClick={() => onUse(match)}>
          Use It{name}
        </button>
      </>
    );
  };

  const dismiss = (event: MouseEvent<HTMLButtonElement>) => {
    // The pressed button is about to go, so the name takes the focus first:
    // through the form at once, where setFocus would wait a tick on the body.
    const field = event.currentTarget.form?.elements.namedItem('name');
    if (field instanceof HTMLInputElement) field.focus();
    warning.dismiss();
  };

  return (
    <TextField<IngredientFormValues>
      name="name"
      label="Name"
      autoComplete="off"
      required
      hint="What this coven calls it. It can differ from the formal name."
      placeholder="Add a name"
      describedBy={shown.length > 0 ? warningId : undefined}
      invalid={blocking}
      after={
        // Always in the page, as a live region must be to be heard: the
        // warning arrives after the typing, and nothing else says so.
        <output className="ingredient-form__duplicates" aria-label="Possible duplicates">
          {(shown.length > 0 || asking) && (
            <div className={blocking ? 'notice notice--error' : 'notice notice--warn'}>
              {/* Plain anchors rather than <Link>, since the caller hands
                  back a plain string, not a typed route. Each in a
                  new tab, so the form and its unsaved changes stay where they
                  are (the owner's call at MB.115's review). */}
              {asking ? (
                <>
                  <p id={warningId}>The compendium has {exact.map(titleOf).join(' or ')}.</p>
                  <ul className="ingredient-form__uses">
                    {exact.map((match) => (
                      <li key={match.id}>{choiceFor(match)}</li>
                    ))}
                  </ul>
                  <button
                    ref={ref}
                    type="button"
                    className="btn btn--quiet btn--small"
                    aria-describedby={warningId}
                    onClick={dismiss}
                  >
                    Add Our Own
                  </button>
                </>
              ) : (
                <>
                  <p id={warningId}>
                    Did you mean{' '}
                    {shown.map((match, index) => (
                      <Fragment key={match.id}>
                        {joinerAt(index, shown.length)}
                        <a href={hrefOf(match)} target="_blank" rel="noopener noreferrer">
                          {titleOf(match)}
                          <span className="visually-hidden"> (opens in a new tab)</span>
                        </a>
                        {choiceFor(match, true)}
                      </Fragment>
                    ))}
                    ?
                  </p>
                  {/* Described by the warning: a save that stops here moves the
                  focus to it, and the focus should say why. None on an
                  edit, whose save the warning never holds. */}
                  {holds && (
                    <button
                      ref={ref}
                      type="button"
                      className="btn btn--quiet btn--small"
                      aria-describedby={warningId}
                      onClick={dismiss}
                    >
                      Create Anyway
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </output>
      }
    />
  );
}
