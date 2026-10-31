'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import IconTip from '../IconTip';
import Notice from '../Notice';
import Spinner from '../Spinner';
import type { ShownToggleProps } from './types';
import './shown-switch.scss';

// The curator's switch for an entry's place in the public compendium, on each admin list row and in
// the entry's details: on is shown, off is hidden. The service is the guard; this is only the control.

const LID_OPEN = 'M1 8C2.8 5 5.2 3.5 8 3.5S13.2 5 15 8';
const LID_SHUT = 'M1 8C2.8 11 5.2 12.5 8 12.5S13.2 11 15 8';
const LOWER_LID = 'C13.2 11 10.8 12.5 8 12.5S2.8 11 1 8z';

export const SetCompendiumEntryShownDocument = graphql(`
  mutation SetCompendiumEntryShown($id: ID!, $shown: Boolean!) {
    setCompendiumEntryShown(id: $id, shown: $shown) {
      id
    }
  }
`);

export default function ShownToggle({
  ingredientId,
  shown,
  name,
  label,
}: ShownToggleProps): ReactElement {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const clipId = useId();
  // The state shown now: it turns when the save returns, not at the press, so the switch waits in place
  // under its ring and then slides; the page's own value follows at the refresh.
  const [on, setOn] = useState(shown);
  const [seen, setSeen] = useState(shown);
  if (shown !== seen) {
    setSeen(shown);
    setOn(shown);
  }
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string>();

  async function change(next: boolean) {
    if (busy) return;
    setBusy(true);
    setRefusal(undefined);
    try {
      await graphqlRequest(SetCompendiumEntryShownDocument, { id: ingredientId, shown: next });
      setOn(next);
      announce(next ? 'Shown in the public compendium.' : 'Hidden from the public compendium.');
      refresh();
    } catch (error) {
      setRefusal(readGraphqlFailure(error).alert);
    } finally {
      setBusy(false);
    }
  }

  const lid = on ? LID_OPEN : LID_SHUT;
  return (
    <>
      <IconTip tip={on ? 'Shown in the Compendium' : 'Hidden in the Compendium'}>
        <label className="shown-switch">
          {label && <span className="shown-switch__label">{label}</span>}
          <span className="shown-switch__control">
            <input
              type="checkbox"
              role="switch"
              checked={on}
              aria-label={label ? undefined : `Shown in Compendium: ${name}`}
              aria-busy={busy}
              onChange={(event) => void change(event.target.checked)}
            />
            <span className="shown-switch__thumb" data-busy={busy || undefined}>
              <svg
                className="shown-switch__eye"
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <g transform="translate(0.25 0)">
                  <defs>
                    <clipPath id={clipId}>
                      <path className="shown-switch__gap" d={lid + LOWER_LID} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${clipId})`} fill="currentColor" stroke="none">
                    <path d="M6.1 5.75A2.7 2.7 0 1 0 9.09 10.01A2.7 2.7 0 0 1 6.1 5.75z" />
                    <path d="M9.6 5.15L10.1 6.05L11 6.55L10.1 7.05L9.6 7.95L9.1 7.05L8.2 6.55L9.1 6.05z" />
                  </g>
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={LID_SHUT} />
                    <path className="shown-switch__lid" d={lid} />
                    <path
                      className="shown-switch__lashes"
                      strokeWidth="0.8"
                      d="M3.1 10.6L2.2 11.6M4.84 11.78L4.3 13.1M6.37 12.32L6.1 13.8M8 12.5V14.1M9.63 12.32L9.9 13.8M11.16 11.78L11.7 13.1M12.9 10.6L13.8 11.6"
                    />
                  </g>
                </g>
              </svg>
            </span>
            {busy && <Spinner className="shown-switch__spinner" />}
          </span>
        </label>
      </IconTip>
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </>
  );
}
