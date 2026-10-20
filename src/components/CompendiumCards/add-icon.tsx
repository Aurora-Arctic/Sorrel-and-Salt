'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useClickFeedback } from '../ClickFeedback';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import { AddCupboardEntryDocument } from '../IngredientEntry/add-cupboard-entry';
import Spinner from '../Spinner';
import AddToCovenDialog from './add-to-coven-dialog';
import type { AddIconProps, HeldLinkProps } from './types';

// The two marks at a compendium card's bottom right, before a curator's Edit (M9.12, the owner's
// call, 2026-10-20): a plus while the entry is not in every coven the viewer may write in, a
// check once it is. Icons alone, named by their tip and an accessible name (`visually-hidden`),
// as the pencil beside them is. Their own file, because the card itself stays a server component
// and a press needs the browser.

const ADD = 'Add to My Ingredients';

/**
 * The plus. With one coven to add to it adds directly, with no quantity: it sends
 * `addCupboardEntry` for that coven and reads the page again, which then draws the check in its
 * place. With several it opens a modal that asks which (`AddToCovenDialog`). `aria-disabled` and
 * not `disabled` while it works, so the focus stays on it and a refusal, said in a callout under
 * it (M12.31), is read from it. The modal says its own refusals.
 */
export const AddIcon = ({
  workspaceId,
  ingredientId,
  covens,
  heldIn,
}: AddIconProps): ReactElement => {
  const asking = covens.length > 1;
  const [picking, setPicking] = useState(false);
  const { pending, refresh } = usePendingNavigation();
  const feedback = useClickFeedback({ name: ADD });
  const add = useMutation({
    mutationFn: () => graphqlRequest(AddCupboardEntryDocument, { workspaceId, ingredientId }),
    onSuccess: () => refresh(),
    // No fields of its own, so the reader always answers with an alert.
    onError: (error) => feedback.report(readGraphqlFailure(error).alert),
  });
  // Busy through the page's re-read too, so a second press cannot add it twice.
  const busy = add.isPending || pending;
  return (
    <>
      <IconTip tip={ADD}>
        <button
          ref={feedback.anchorRef}
          type="button"
          className="icon-tip__add"
          aria-busy={busy || undefined}
          aria-disabled={busy || undefined}
          onClick={() => {
            if (busy) return;
            feedback.report(undefined);
            if (asking) setPicking(true);
            else add.mutate();
          }}
        >
          {busy ? <Spinner /> : <PlusIcon />}
          <span className="visually-hidden">{ADD}</span>
        </button>
      </IconTip>
      {feedback.feedback}
      {picking && (
        <AddToCovenDialog
          workspaceId={workspaceId}
          ingredientId={ingredientId}
          covens={covens}
          heldIn={heldIn}
          onClose={() => setPicking(false)}
          onAdded={refresh}
        />
      )}
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
