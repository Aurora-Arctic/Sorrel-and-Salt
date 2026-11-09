'use client';

import { type ReactElement, useId, useMemo, useState } from 'react';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import Notice from '../Notice';
import { fuzzyMatcher } from '../../lib/fuzzy-match';
import { useHydrated } from '../../lib/hydrated';
import { PrintedCardMark, RefusalWho } from './refusal-parts';
import type { RefusalEntry } from './types';

// The invitation refusals widget's picker: the reader finds the sentence they saw and gets it back as the accept page drew
// it, with who can fix it and what to do now. Drawn only once hydrated, as it does nothing without a script; the server's
// list beneath it holds the same answers (claude-docs/components/help-pages.md, "Widgets").

const LABEL = 'The Message You Saw';

const RefusalFinder = ({ entries }: { entries: readonly RefusalEntry[] }): ReactElement | null => {
  const id = useId();
  const hydrated = useHydrated();
  const choices = useMemo(
    () => entries.map((entry) => ({ value: entry.key, label: entry.message })),
    [entries],
  );
  const match = useMemo(() => fuzzyMatcher(choices, (choice) => choice.label), [choices]);
  const [value, setValue] = useState(entries[0]?.key ?? '');
  // The last message chosen, kept while the box is typed over, so the answer does not empty mid-search.
  const [shown, setShown] = useState(value);

  const entry = entries.find((candidate) => candidate.key === shown);
  if (!hydrated || !entry) return null;

  return (
    <>
      <div className="field help-widget__finder">
        <label className="field__label" id={`${id}-label`} htmlFor={id}>
          {LABEL}
        </label>
        <ComboboxTypeahead
          id={id}
          label={LABEL}
          labelId={`${id}-label`}
          value={value}
          onChange={(next) => {
            setValue(next);
            if (next) setShown(next);
          }}
          choices={choices}
          match={match}
          placeholder="Search"
          clearable
        />
      </div>
      <div className="help-widget__answer" role="status" aria-label="What It Means">
        {/* Widget furniture, not part of the error, which the accept page draws as the message alone. */}
        {entry.card && (
          <p className="help-widget__kind">
            <PrintedCardMark />
          </p>
        )}
        <Notice kind="error" inRegion>
          {entry.message}
        </Notice>
        <dl className="help-widget__facts">
          <div>
            <dt>Who Can Fix It</dt>
            <dd>
              <RefusalWho who={entry.who} />
            </dd>
          </div>
          <div>
            <dt>What to Do Now</dt>
            <dd>{entry.now}</dd>
          </div>
        </dl>
        {entry.action && (
          <p className="help-widget__action">
            <a className="btn btn--solid btn--small" href={entry.action.href}>
              {entry.action.label}
            </a>
            <span className="help-widget__explained">
              The button the accept page shows for this.
            </span>
          </p>
        )}
      </div>
    </>
  );
};

export default RefusalFinder;
