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
import './index.scss';

// The plus: Add to My Ingredients as an icon (M9.12, the owner's calls, 2026-10-20), at a
// compendium card's bottom right and beside the public entry page's pencil, so both are one
// control. Its tip and its accessible name are both ADD and then the entry's name (the name in
// `visually-hidden`), so a list of buttons tells one card's plus from the next and the words on
// screen are the name (MB.120; the owner's call, 2026-10-20, that the tip says the name too). A client component of its own, because the card stays a server component and a press
// needs the browser. claude-docs/components/compendium-cards.md, "The plus".

const ADD = 'Add to My Ingredients';
/**
 * What a held coven's check in the plus's menu stands for, joined to the coven's name: "Hedge
 * Coven, in its cupboard". The same noun as the card's In Every Cupboard, which speaks for them
 * all (MB.120, the owner's call, 2026-10-20).
 */
const HELD_MARK = 'in its cupboard';
/**
 * How long the check holds after a success before it fades back to the plus (the owner's call,
 * 2026-10-20: "about 1s"). Long enough to be seen, short enough that the plus is soon back.
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
 * The plus. Where the viewer may write in one coven alone it adds there directly, with no
 * quantity: it sends `addCupboardEntry` for that coven and reads the page again, which then draws
 * the check in its place. With two or more it is always a menu of every one of them by name (the
 * owner’s calls of 2026-10-20: over the modal picker it first opened, and never adding at once
 * because one coven alone lacks the entry), and choosing one adds there at once. A coven that
 * holds the entry is shown disabled, with a green check after its name, and is named "<coven>,
 * in its cupboard" (the owner’s calls, 2026-10-20; the words MB.120's); the plus's own check says when every one holds
 * it. A refusal is said in a callout under the plus (M12.31), and the focus is given back to the
 * plus for it, since the chosen item went with the menu. The plus is `aria-disabled` and not
 * `disabled` while it works, the lone plus here and the menu's button in MenuButton, so the focus
 * stays on it (MB.120).
 */
const AddIcon = ({
  name: entry,
  workspaceId,
  ingredientId,
  covens,
  heldIn,
  holding: holders = [],
}: NamedAddIconProps): ReactElement => {
  // "Add to My Ingredients: Testwort, Formalis testis", the tip and the name alike, so the words
  // on screen are the name (WCAG 2.5.3), and a colon, since a formal name holds a comma of its own.
  // Then how many of the viewer's covens hold it, and which (M12.55): nothing where none does.
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
  // The check after a success (the owner's call, 2026-10-20): it holds for ADDED_HOLD_MS and
  // until the page has been read again, then fades back to the plus, unless the add left every
  // coven holding the entry, when it stays until the page draws the held mark in its place, so
  // nothing jumps. `useFade` keeps it drawn while it fades, and drops the fade under reduced
  // motion, so the plus is back at once there.
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

  if (covens.length > 1)
    return (
      <>
        <IconTip tip={label}>
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
        </IconTip>
        {feedback.feedback}
      </>
    );

  // The one coven, or the default where the page named no covens.
  const only = covens[0]?.id ?? workspaceId;
  return (
    <>
      <IconTip tip={label}>
        <button
          ref={plusRef}
          type="button"
          className="add-icon"
          data-state={state}
          aria-busy={busy || undefined}
          aria-disabled={busy || state !== undefined || undefined}
          onClick={() => {
            if (!busy && !state) addTo(only);
          }}
        >
          {glyph}
          <HoldingCount holding={holders} />
          <span className="visually-hidden">{label}</span>
        </button>
      </IconTip>
      {feedback.feedback}
    </>
  );
};

export default AddIcon;
