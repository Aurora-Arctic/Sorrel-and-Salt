'use client';

import {
  type MouseEvent,
  type ReactElement,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useFormState } from 'react-hook-form';

type Problem = { id: string; label: string; message: string };

const textOf = (id: string) => document.getElementById(id)?.textContent ?? '';

function labelOf(control: HTMLElement): string {
  const labelledBy = control.getAttribute('aria-labelledby');
  const text = labelledBy
    ? labelledBy.split(' ').map(textOf).join(' ')
    : ((control as HTMLInputElement).labels?.[0]?.textContent ??
      control.getAttribute('aria-label') ??
      '');
  return text.replace(/\*$/, '').trim();
}

function messageOf(control: HTMLElement): string {
  const ids = (control.getAttribute('aria-describedby') ?? '').split(' ');
  const error = ids.find((id) => id.endsWith('-error'));
  return error ? textOf(error).replace(/^Error:\s*/, '') : '';
}

/**
 * Every control marked invalid inside `root`, in page order. Read from the page rather than the form's
 * errors, so a list's entries, never registered as fields, are listed with the fields.
 */
function problemsIn(root: Element | null | undefined): Problem[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>('[aria-invalid="true"]')]
    .filter((control) => control.id !== '')
    .map((control) => ({
      id: control.id,
      label: labelOf(control),
      message: messageOf(control),
    }));
}

/**
 * Lists a form's errors at its top once a Save fails, each linking to its field, and takes the focus so a
 * screen reader hears them first. While any are listed the page title opens with "Error: ". It lists the
 * controls marked invalid under `within`, else under the form it sits in. A form using it sets
 * `shouldFocusError: false`, or react-hook-form's own focus takes the focus back.
 */
export function FormErrorSummary({
  within,
}: {
  within?: RefObject<HTMLElement | null>;
}): ReactElement | null {
  const { submitCount, errors } = useFormState();
  const box = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const focusedFor = useRef(0);
  const headingId = useId();
  const [problems, setProblems] = useState<Problem[]>([]);

  // Layout effects, so the list and the focus land in the commit that draws the errors.
  useLayoutEffect(() => {
    if (submitCount === 0) return;
    const root = within?.current ?? anchor.current?.closest('form');
    // The page is read after the render that drew the errors; the fields below this one have drawn them.
    setProblems(problemsIn(root));
  }, [submitCount, errors, within]);
  useLayoutEffect(() => {
    if (problems.length === 0 || focusedFor.current === submitCount) return;
    focusedFor.current = submitCount;
    box.current?.focus();
  }, [problems, submitCount]);

  const listed = problems.length > 0;
  useEffect(() => {
    if (!listed) return;
    const title = document.title;
    document.title = `Error: ${title}`;
    return () => {
      document.title = title;
    };
  }, [listed]);

  const follow = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const control = document.getElementById(id);
    control?.scrollIntoView?.({ block: 'center' });
    control?.focus({ preventScroll: true });
  };

  return (
    <>
      <span ref={anchor} hidden />
      {listed && (
        <div
          ref={box}
          role="group"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="notice notice--error form-error-summary"
        >
          <h2 id={headingId} className="form-error-summary__heading">
            There Is a Problem
          </h2>
          <ul>
            {problems.map((problem) => (
              <li key={problem.id}>
                <a href={`#${problem.id}`} onClick={(event) => follow(event, problem.id)}>
                  {problem.message || problem.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
