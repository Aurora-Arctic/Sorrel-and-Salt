'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import IconTip, { LiddedEyeIcon } from '../IconTip';
import Notice from '../Notice';
import Spinner from '../Spinner';
import type { ShownToggleProps } from './types';
import './shown-switch.scss';

// The curator's switch for an entry's place in the public compendium, on each admin list row and in
// the entry's details: on is shown, off is hidden. The service is the guard; this is only the control.

// The cross-fade between the thumb and the ring (`$fade` in shown-switch.scss).
const RING_FADE_MS = 150;
// How long a save runs before the ring shows (`$loading-delay` in _variables.scss).
const RING_DELAY_MS = 100;

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
  onChange,
  name,
  label,
  accessibleName,
}: ShownToggleProps): ReactElement {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  // The position shown now: it turns at the press and the save follows; the page's own value follows at the refresh.
  const [on, setOn] = useState(shown);
  const [seen, setSeen] = useState(shown);
  if (shown !== seen) {
    setSeen(shown);
    setOn(shown);
  }
  const [busy, setBusy] = useState(false);
  // The ring stays mounted through its fade out.
  const [ring, setRing] = useState(false);
  // The position last pressed and the one last saved: a save runs until they agree, so the last press is what is stored.
  const wanted = useRef(shown);
  const saved = useRef(shown);
  const running = useRef(false);
  // The page's value is what is stored once it has read again.
  useEffect(() => {
    saved.current = shown;
  }, [shown]);
  const [refusal, setRefusal] = useState<string>();

  async function change(next: boolean) {
    // A form field only reports: the form's Save writes it.
    if (onChange || ingredientId === undefined) {
      onChange?.(next);
      return;
    }
    setOn(next);
    wanted.current = next;
    // A save already out sends this position when it returns.
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setRing(true);
    setRefusal(undefined);
    const started = Date.now();
    let failed = false;
    try {
      while (wanted.current !== saved.current) {
        const sending = wanted.current;
        await graphqlRequest(SetCompendiumEntryShownDocument, { id: ingredientId, shown: sending });
        saved.current = sending;
      }
    } catch (error) {
      failed = true;
      setRefusal(readGraphqlFailure(error).alert);
      // The switch goes back to what is stored.
      wanted.current = saved.current;
      setOn(saved.current);
    }
    // The ring fades out and the thumb back in, in place.
    const ringed = Date.now() - started >= RING_DELAY_MS;
    setBusy(false);
    if (ringed) await new Promise((resolve) => setTimeout(resolve, RING_FADE_MS));
    setRing(false);
    running.current = false;
    if (!failed) {
      announce(
        saved.current ? 'Shown in the public compendium.' : 'Hidden from the public compendium.',
      );
      refresh();
      // A press during the fade is sent now.
      if (wanted.current !== saved.current) void change(wanted.current);
    }
  }

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
              aria-label={label ? undefined : (accessibleName ?? `Shown in Compendium: ${name}`)}
              aria-busy={busy}
              onChange={(event) => void change(event.target.checked)}
            />
            <span className="shown-switch__thumb">
              <LiddedEyeIcon open={on} className="shown-switch__eye" />
            </span>
            <span className="shown-switch__ring">
              {ring && <Spinner className="shown-switch__spinner" />}
            </span>
          </span>
        </label>
      </IconTip>
      {refusal && <Notice kind="error">{refusal}</Notice>}
    </>
  );
}
