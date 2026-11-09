import { type FieldFormat, tidy } from '../../lib/formats';
import type { TextControlProps } from './types';

// What the react-hook-form TextField and the plain-state PlainTextField share, so the two cannot drift
// (claude-docs/components/field.md, "Text fields").

/** The blur format: the caller's, else `tidy` for a single line, else none (a multiline field keeps its line breaks). */
export const blurFormat = ({
  format,
  multiline,
}: Pick<TextControlProps, 'format' | 'multiline'>): FieldFormat | undefined =>
  format ?? (multiline ? undefined : tidy);

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
}: Pick<
  TextControlProps,
  | 'type'
  | 'multiline'
  | 'inputMode'
  | 'autoComplete'
  | 'spellCheck'
  | 'autoCapitalize'
  | 'enterKeyHint'
>) {
  const identifier = !multiline && type !== undefined && IDENTIFIER_TYPES.has(type);
  return {
    inputMode,
    autoComplete: autoComplete ?? ('off' as const),
    spellCheck: spellCheck ?? (multiline ? true : identifier ? false : undefined),
    autoCapitalize: autoCapitalize ?? (type === 'email' || type === 'url' ? 'none' : undefined),
    enterKeyHint,
    // Any decimal: the browser's default step is whole numbers, which would flag 2.5 as invalid.
    step: type === 'number' ? ('any' as const) : undefined,
  };
}
