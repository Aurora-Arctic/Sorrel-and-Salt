'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import IconTip, { ArrowIcon } from '../IconTip';
import Notice from '../Notice';

// A move writes the guide's whole order back through `childIds`, which releases any child it leaves out, so the
// order comes from every live sub page, never the filtered table (claude-docs/components/help-outline.md).

export const OrderHelpSubPagesDocument = graphql(`
  mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {
    updateHelpArticle(id: $id, input: $input) {
      id
    }
  }
`);

/** The order with the entry at `index` swapped with its neighbour `by` places away. */
export const moved = (order: readonly string[], index: number, by: -1 | 1): string[] => {
  const next = [...order];
  const other = index + by;
  [next[index], next[other]] = [next[other], next[index]];
  return next;
};

const HelpMoveButtons = ({
  guideId,
  order,
  index,
  title,
}: {
  guideId: string;
  order: readonly string[];
  index: number;
  title: string;
}): ReactElement => {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string>();

  const move = async (by: -1 | 1) => {
    setBusy(true);
    setRefusal(undefined);
    try {
      await graphqlRequest(OrderHelpSubPagesDocument, {
        id: guideId,
        input: { childIds: moved(order, index, by) },
      });
      announce(`Moved ${title} to position ${index + by + 1}.`);
      refresh();
    } catch (error) {
      setRefusal(readGraphqlFailure(error).alert);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="help-outline__move">
      <IconTip tip="Move Up">
        <button
          type="button"
          className="icon-tip__edit icon-tip__edit--ink"
          disabled={busy || index === 0}
          aria-busy={busy}
          onClick={() => void move(-1)}
        >
          <ArrowIcon />
          <span className="visually-hidden">Move Up {title}</span>
        </button>
      </IconTip>
      <IconTip tip="Move Down">
        <button
          type="button"
          className="icon-tip__edit icon-tip__edit--ink"
          disabled={busy || index === order.length - 1}
          aria-busy={busy}
          onClick={() => void move(1)}
        >
          <ArrowIcon down />
          <span className="visually-hidden">Move Down {title}</span>
        </button>
      </IconTip>
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </span>
  );
};

export default HelpMoveButtons;
