import type { InputHTMLAttributes, ReactElement, ReactNode, TextareaHTMLAttributes } from 'react';
import { type FieldFormat, tidy, trimEnds } from '../../lib/formats';
import Spinner from '../Spinner';
import type { TextControlProps } from './types';

// What the react-hook-form TextField and the plain-state PlainTextField share, so the two cannot drift
// (claude-docs/components/field.md, "Text fields").

/** The blur format: the caller's, else `tidy` for a single line, else `trimEnds` for multiline text (which keeps its line breaks). */
export const blurFormat = ({
  format,
  multiline,
}: Pick<TextControlProps, 'format' | 'multiline'>): FieldFormat | undefined =>
  format ?? (multiline ? trimEnds : tidy);

const IDENTIFIER_TYPES = new Set(['email', 'url', 'tel']);

/** The attributes both text fields put on the control, with the defaults for identifiers and prose. */
export function browserAttributes({
  type,
  multiline,
  inputMode,
  autoComplete,
  spellCheck,
  autoCapitalize,
  enterKeyHint,
  autoFocus,
  ignorePasswordManagers,
}: Pick<
  TextControlProps,
  | 'type'
  | 'multiline'
  | 'inputMode'
  | 'autoComplete'
  | 'spellCheck'
  | 'autoCapitalize'
  | 'enterKeyHint'
  | 'autoFocus'
  | 'ignorePasswordManagers'
>) {
  const identifier = !multiline && type !== undefined && IDENTIFIER_TYPES.has(type);
  return {
    inputMode,
    autoComplete: autoComplete ?? ('off' as const),
    spellCheck: spellCheck ?? (multiline ? true : identifier ? false : undefined),
    autoCapitalize: autoCapitalize ?? (type === 'email' || type === 'url' ? 'none' : undefined),
    enterKeyHint,
    autoFocus,
    'data-1p-ignore': ignorePasswordManagers || undefined,
    // Any decimal: the browser's default step is whole numbers, which would flag 2.5 as invalid.
    step: type === 'number' ? ('any' as const) : undefined,
  };
}

/** What both text fields hand the control: the props they build from the form or from state. */
type ControlAttributes = InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

/** The ids a text field is described by, joined, with its limit's count among them. */
export const describedByWithCount = (
  describedBy: string | undefined,
  limit: number | undefined,
  countId: string,
): string | undefined => [describedBy, limit && countId].filter(Boolean).join(' ') || undefined;

/** The field's slot after its label: the limit's count, then the caller's own. */
export function afterCount(count: ReactNode, after: ReactNode): ReactElement | undefined {
  return count || after ? (
    <>
      {count}
      {after}
    </>
  ) : undefined;
}

/** The textarea or input a text field draws, with the spinner of a field that looks its text up. */
export function TextControl({
  multiline,
  rows,
  type,
  busy,
  control,
}: Pick<TextControlProps, 'multiline' | 'rows' | 'type' | 'busy'> & {
  control: ControlAttributes;
}): ReactElement {
  if (multiline) return <textarea className="textarea" rows={rows} {...control} />;
  if (busy === undefined) return <input className="input" type={type} {...control} />;
  // Wrapped only when the caller says, so other fields keep a bare input.
  return (
    <span className="field__control">
      <input className="input" type={type} aria-busy={busy || undefined} {...control} />
      {busy && <Spinner className="field__busy" />}
    </span>
  );
}
