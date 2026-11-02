import type { ReactElement } from 'react';
import type { CharacterCountProps } from './types';

// How many characters a field has left, said once it is past three quarters of its limit, in a polite live
// region that is always drawn so a screen reader announces the text as it appears. It never stops typing: the
// server is the authority on the limit (claude-docs/components/field.md, "Character count").

/** The share of the limit after which the count shows. */
const SHOWN_AFTER = 0.75;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** What the count says for a field of `length` characters under `limit`; empty until it is worth saying. */
export function characterCountText(length: number, limit: number): string {
  if (length <= limit * SHOWN_AFTER) return '';
  return length > limit
    ? `${plural(length - limit, 'character')} over`
    : `${plural(limit - length, 'character')} left`;
}

export function CharacterCount({ id, length, limit }: CharacterCountProps): ReactElement {
  return (
    <p id={id} className="field__hint" aria-live="polite">
      {characterCountText(length, limit)}
    </p>
  );
}
