'use client';

import type { ReactElement } from 'react';

/** The trap field: a person never sees it, so a value in it is a bot's. */
export const BotTrapField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}): ReactElement => (
  <div hidden>
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);
