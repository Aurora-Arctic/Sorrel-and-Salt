import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
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

/**
 * Merges the caller's ref with one that hands the form text typed into the server HTML before hydration, which fires no
 * change event React sees; without it the form stays clean and Save stays shut.
 */
function useEarlyTypedText(
  control: ControlAttributes,
): Ref<HTMLInputElement & HTMLTextAreaElement> {
  const latest = useRef(control);
  const seen = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    latest.current = control;
  });
  const { ref } = control as ControlAttributes & {
    ref?: Ref<HTMLInputElement & HTMLTextAreaElement>;
  };
  // Follows the caller's ref: react-hook-form hands a new one each render and relies on React calling it again.
  return useCallback(
    (node: (HTMLInputElement & HTMLTextAreaElement) | null) => {
      const { value, onChange } = latest.current;
      const typed = node?.value ?? '';
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      // The ref is called again for the same element on every render; only the first call can see pre-hydration text.
      if (!node || node === seen.current) return;
      seen.current = node;
      if (typed === '') return;
      // A controlled field was rendered with `value`, so only a different text was typed; a registered one has none, and any text is typed.
      if (value !== undefined && typed === String(value)) return;
      node.value = typed;
      onChange?.({ target: node, currentTarget: node, type: 'change' } as unknown as ChangeEvent<
        HTMLInputElement & HTMLTextAreaElement
      >);
    },
    [ref],
  );
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
  const ref = useEarlyTypedText(control);
  const attributes = { ...control, ref };
  if (multiline) return <textarea className="textarea" rows={rows} {...attributes} />;
  if (busy === undefined) return <input className="input" type={type} {...attributes} />;
  // Wrapped only when the caller says, so other fields keep a bare input.
  return (
    <span className="field__control">
      <input className="input" type={type} aria-busy={busy || undefined} {...attributes} />
      {busy && <Spinner className="field__busy" />}
    </span>
  );
}
