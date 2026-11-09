'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import IconTip, { LiddedEyeIcon } from '../IconTip';
import Notice from '../Notice';
import Spinner from '../Spinner';
import type { ShownSwitchProps } from './types';
import './index.scss';

// Must equal `$fade` in index.scss.
const RING_FADE_MS = 150;
// Must equal `$loading-delay` in _variables.scss.
const RING_DELAY_MS = 100;

/** The lidded-eye switch that shows or hides a row to readers, saving each press as it lands. */
export default function ShownSwitch({
  shown,
  save,
  onChange,
  tip,
  announcement,
  label,
  accessibleName,
}: ShownSwitchProps): ReactElement {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const [on, setOn] = useState(shown);
  const [seen, setSeen] = useState(shown);
  if (shown !== seen) {
    setSeen(shown);
    setOn(shown);
  }
  const [busy, setBusy] = useState(false);
  const [ring, setRing] = useState(false);
  // The position last pressed and the one last saved: a save runs until they agree, so the last press is what is stored.
  const wanted = useRef(shown);
  const saved = useRef(shown);
  const running = useRef(false);
  useEffect(() => {
    saved.current = shown;
  }, [shown]);
  const [refusal, setRefusal] = useState<string>();

  async function change(next: boolean) {
    if (onChange || save === undefined) {
      onChange?.(next);
      return;
    }
    setOn(next);
    wanted.current = next;
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
        await save(sending);
        saved.current = sending;
      }
    } catch (error) {
      failed = true;
      setRefusal(readGraphqlFailure(error).alert);
      wanted.current = saved.current;
      setOn(saved.current);
    }
    const ringed = Date.now() - started >= RING_DELAY_MS;
    setBusy(false);
    if (ringed) await new Promise((resolve) => setTimeout(resolve, RING_FADE_MS));
    setRing(false);
    running.current = false;
    if (!failed) {
      announce(announcement(saved.current));
      refresh();
      if (wanted.current !== saved.current) void change(wanted.current);
    }
  }

  return (
    <>
      <IconTip tip={tip(on)}>
        <label className="shown-switch">
          {label && <span className="shown-switch__label">{label}</span>}
          <span className="shown-switch__control">
            <input
              type="checkbox"
              role="switch"
              checked={on}
              aria-label={label ? undefined : accessibleName}
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
