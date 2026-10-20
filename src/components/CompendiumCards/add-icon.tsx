'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useClickFeedback } from '../ClickFeedback';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import { AddCupboardEntryDocument } from '../IngredientEntry/add-cupboard-entry';
import Spinner from '../Spinner';
import type { AddIconProps, HeldLinkProps } from './types';

// The two marks at a compendium card's bottom left (M9.12, the owner's call, 2026-10-20):
// a plus while the coven does not hold the entry, a check once it does. Icons alone, named by
// their tip and an accessible name (`visually-hidden`), as the pencil beside them is. Their
// own file, because the card itself stays a server component and a press needs the browser.

const ADD = 'Add to My Ingredients';

/**
 * The plus. Until M9.12's dialog exists it adds directly, with no quantity: it sends
 * `addCupboardEntry` for the switcher's coven and reads the page again, which then draws the
 * check in its place. `aria-disabled` and not `disabled` while it works, so the focus stays on
 * it and a refusal, said in a callout under it (M12.31), is read from it.
 */
export const AddIcon = ({ workspaceId, ingredientId }: AddIconProps): ReactElement => {
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
            add.mutate();
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

/** The check: the coven holds this entry, and the link leads to it there. */
export const HeldLink = ({ href }: HeldLinkProps): ReactElement => (
  <IconTip tip="In My Ingredients">
    <Link className="icon-tip__held" href={href}>
      <CheckIcon />
      <span className="visually-hidden">In My Ingredients</span>
    </Link>
  </IconTip>
);
