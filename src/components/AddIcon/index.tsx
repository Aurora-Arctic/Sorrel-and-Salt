'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useClickFeedback } from '../ClickFeedback';
import { useFade } from '../ClickFeedback/fade';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import { AddCupboardEntryDocument } from '../IngredientEntry/add-cupboard-entry';
import MenuButton from '../MenuButton';
import Spinner from '../Spinner';
import { HoldingCount, holdingText } from './holding';
import type { NamedAddIconProps } from './types';
import { ADD, HELD_MARK } from './wording';
import './index.scss';

// Add to My Ingredients as an icon, at a compendium card's bottom right and beside the entry page's
// pencil. Tip and accessible name are ADD then the entry's name; a client component of its own so the
// card stays a server component (claude-docs/components/compendium-cards.md, "Contracts").

/**
 * How long the check holds after a success before it fades back to the plus:
 * about 1s, long enough to be seen, short enough that the plus is soon back.
 */
export const ADDED_HOLD_MS = 1000;

/** What the plus draws after an add: nothing yet, or the coven it added to and whether that left none lacking it. */
interface Added {
  to: string;
  last: boolean;
}

/**
 * The glyph in the plus: the spinner while busy, the check once an add has worked, and the plus.
 * While the check fades back (`returning`) both are drawn, stacked, so the one fades into the
 * other; the stylesheet does the drawing and the fades from the button's `data-state`.
 */
const Glyph = ({
  state,
  busy,
  onFaded,
}: {
  state: 'added' | 'returning' | undefined;
  busy: boolean;
  onFaded: ReturnType<typeof useFade>['onAnimationEnd'];
}): ReactElement =>
  state ? (
    <span className="add-icon__glyphs">
      <span className="add-icon__check" onAnimationEnd={onFaded}>
        <CheckIcon />
      </span>
      {state === 'returning' && (
        <span className="add-icon__plus">
          <PlusIcon />
        </span>
      )}
    </span>
  ) : busy ? (
    <Spinner />
  ) : (
    <PlusIcon />
  );

/**
 * The plus: with one writable coven it adds there directly, with no quantity, and the page reads
 * again; with two or more it opens a menu of every coven, never adding at once. A refusal is a
 * callout under the plus (claude-docs/components/add-icon.md, "What the plus is").
 */
const AddIcon = ({
  name: entry,
  workspaceId,
  ingredientId,
  covens,
  heldIn,
  holding: holders = [],
}: NamedAddIconProps): ReactElement => {
  // "Add to My Ingredients: Testwort, Formalis testis", the tip and the name alike,
  // so the words on screen are the name (WCAG 2.5.3), and a colon, since a formal
  // name holds a comma of its own. Then how many covens hold it, and which.
  const label = `${ADD}: ${entry}${holdingText(holders)}`;
  const { pending, refresh } = usePendingNavigation();
  const feedback = useClickFeedback({ name: label });
  const { anchorRef } = feedback;
  const plus = useRef<HTMLButtonElement | null>(null);
  const plusRef = useCallback(
    (node: HTMLButtonElement | null) => {
      plus.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  // The check after a success: it holds for ADDED_HOLD_MS and until the page has been read again, then
  // fades back to the plus, unless the add left every coven holding the entry, when it stays until the
  // held mark replaces it. `useFade` keeps it drawn while it fades and drops the fade under reduced motion.
  const [added, setAdded] = useState<Added | null>(null);
  const [held, setHeld] = useState(false);
  const name = (to: string): string => covens.find(({ id }) => id === to)?.name ?? 'My Ingredients';
  const add = useMutation({
    mutationFn: (to: string) =>
      graphqlRequest(AddCupboardEntryDocument, { workspaceId: to, ingredientId }),
    onSuccess: (_data, to) => {
      setAdded({
        to,
        last: covens.every(({ id }) => id === to || heldIn.includes(id)),
      });
      feedback.announce(`Added to ${name(to)}.`);
      refresh();
    },
    // No fields of its own, so the reader always answers with an alert.
    onError: (error) => feedback.report(readGraphqlFailure(error).alert),
  });
  // Once the refusal has re-enabled the plus: the menu's item that was pressed is gone.
  const refused = add.isError;
  useEffect(() => {
    if (refused) plus.current?.focus();
  }, [refused]);
  // Busy through the page's re-read too, so a second press cannot add it twice.
  const busy = add.isPending || pending;
  const checked = added !== null && (added.last || !held || pending);
  const fade = useFade(checked);
  useEffect(() => {
    if (added === null || added.last) return;
    const timer = window.setTimeout(() => setHeld(true), ADDED_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [added]);
  const state = checked ? 'added' : fade.closing ? 'returning' : undefined;
  // Until the page says so, the coven just added to counts as holding the entry.
  const holding = added ? [...heldIn, added.to] : heldIn;
  const addTo = (to: string): void => {
    feedback.report(undefined);
    setAdded(null);
    setHeld(false);
    add.mutate(to);
  };
  const glyph = <Glyph state={state} busy={busy} onFaded={fade.onAnimationEnd} />;

  // The control is the one thing that differs: a menu where the viewer writes in several
  // covens, a plain button for the one coven (or the default where the page named none).
  const control =
    covens.length > 1 ? (
      <MenuButton
        ref={plusRef}
        label={label}
        className="add-icon"
        icon={
          <>
            {glyph}
            <HoldingCount holding={holders} />
          </>
        }
        state={state}
        busy={busy && !state}
        busyLabel="Adding"
        items={[...covens]
          .sort((one, other) => one.name.localeCompare(other.name))
          .map(({ id, name }) =>
            holding.includes(id)
              ? { key: id, label: name, onSelect: () => {}, disabled: true, mark: HELD_MARK }
              : { key: id, label: name, onSelect: () => addTo(id) },
          )}
      />
    ) : (
      <button
        ref={plusRef}
        type="button"
        className="add-icon"
        data-state={state}
        aria-busy={busy || undefined}
        aria-disabled={busy || state !== undefined || undefined}
        onClick={() => {
          if (!busy && !state) addTo(covens[0]?.id ?? workspaceId);
        }}
      >
        {glyph}
        <HoldingCount holding={holders} />
        <span className="visually-hidden">{label}</span>
      </button>
    );

  return (
    <>
      <IconTip tip={label}>{control}</IconTip>
      {feedback.feedback}
    </>
  );
};

export default AddIcon;
