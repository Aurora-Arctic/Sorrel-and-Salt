'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useCallback, useEffect, useRef } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useClickFeedback } from '../ClickFeedback';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import { AddCupboardEntryDocument } from '../IngredientEntry/add-cupboard-entry';
import MenuButton from '../MenuButton';
import Spinner from '../Spinner';
import type { AddIconProps, HeldLinkProps } from './types';

// The two marks at a compendium card's bottom right, before a curator's Edit (M9.12, the owner's
// call, 2026-10-20): a plus while the entry is not in every coven the viewer may write in, a
// check once it is. Icons alone, named by their tip and an accessible name (`visually-hidden`),
// as the pencil beside them is. Their own file, because the card itself stays a server component
// and a press needs the browser.

const ADD = 'Add to My Ingredients';

/**
 * The plus. With one coven left without the entry it adds there directly, with no quantity: it
 * sends `addCupboardEntry` for that coven and reads the page again, which then draws the check
 * in its place. With several it is a menu of those covens by name (the owner's call,
 * 2026-10-20, over the modal picker it first opened), and choosing one adds there at once. A
 * coven that holds the entry is left off rather than shown disabled, as a menu item cannot be;
 * the check says when every one holds it. A refusal is said in a callout under the plus
 * (M12.31), and the focus is given back to the plus for it, since the chosen item went with the
 * menu. The lone plus is `aria-disabled` and not `disabled` while it works, so the focus
 * stays on it; the menu's button is disabled while busy, as MenuButton has it.
 */
export const AddIcon = ({
  workspaceId,
  ingredientId,
  covens,
  heldIn,
}: AddIconProps): ReactElement => {
  const lacking = covens.filter(({ id }) => !heldIn.includes(id));
  const { pending, refresh } = usePendingNavigation();
  const feedback = useClickFeedback({ name: ADD });
  const { anchorRef } = feedback;
  const plus = useRef<HTMLButtonElement | null>(null);
  const plusRef = useCallback(
    (node: HTMLButtonElement | null) => {
      plus.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const add = useMutation({
    mutationFn: (to: string) =>
      graphqlRequest(AddCupboardEntryDocument, { workspaceId: to, ingredientId }),
    onSuccess: () => refresh(),
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
  const addTo = (to: string): void => {
    feedback.report(undefined);
    add.mutate(to);
  };

  if (lacking.length > 1)
    return (
      <>
        <IconTip tip={ADD}>
          <MenuButton
            ref={plusRef}
            label={ADD}
            className="icon-tip__add"
            icon={<PlusIcon />}
            busy={busy}
            busyLabel="Adding"
            items={lacking.map(({ id, name }) => ({
              key: id,
              label: name,
              onSelect: () => addTo(id),
            }))}
          />
        </IconTip>
        {feedback.feedback}
      </>
    );

  // The one coven without it, or the default where the page named no covens.
  const only = lacking[0]?.id ?? workspaceId;
  return (
    <>
      <IconTip tip={ADD}>
        <button
          ref={plusRef}
          type="button"
          className="icon-tip__add"
          aria-busy={busy || undefined}
          aria-disabled={busy || undefined}
          onClick={() => {
            if (!busy) addTo(only);
          }}
        >
          {busy ? <Spinner /> : <PlusIcon />}
          <span className="visually-hidden">{ADD}</span>
        </button>
      </IconTip>
      {feedback.feedback}
    </>
  );
};

/**
 * The check: the coven holds this entry, and the link leads to it there, the coven's list
 * filtered to it. A `PendingLink`, as the loading standard has every navigating link
 * (claude-docs/loading.md): busy while the list is on its way, which draws its cards in the
 * public frame's main region, since the coven's frame is not on this page.
 */
export const HeldLink = ({ href }: HeldLinkProps): ReactElement => (
  <IconTip tip="In My Ingredients">
    <PendingLink
      className="icon-tip__held"
      href={href}
      navigationTarget={ingredientLinkTarget(href, false)}
    >
      <CheckIcon />
      <span className="visually-hidden">In My Ingredients</span>
    </PendingLink>
  </IconTip>
);
