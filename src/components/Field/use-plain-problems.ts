'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Failure } from '../../lib/types';

export type PlainProblems<K extends string> = Partial<Record<K, string>>;

/**
 * The problems of a form that holds its values in state: the ones found before sending, merged with the one
 * field the server refused. `refuse` shows what was found and moves focus to the first of `order`; a refusal
 * from the server is focused the same way. `groups` names a field whose box is an element of its own (a radio
 * group), whose first input stands for it.
 */
export function usePlainProblems<K extends string>(
  order: readonly K[],
  failure: Failure,
  groups: Partial<Record<K, string>> = {},
): {
  formRef: RefObject<HTMLFormElement | null>;
  shown: PlainProblems<K>;
  edited: (name: K) => void;
  refuse: (found: PlainProblems<K>) => boolean;
} {
  const formRef = useRef<HTMLFormElement>(null);
  const [problems, setProblems] = useState<PlainProblems<K>>({});
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  function focus(name: K | undefined) {
    if (name === undefined) return;
    const group = groupsRef.current[name];
    const target = group
      ? document.getElementById(group)?.querySelector<HTMLElement>('input')
      : formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`);
    target?.focus();
  }

  const refused = failure.field?.name as K | undefined;
  useEffect(() => {
    if (refused !== undefined && order.includes(refused)) focus(refused);
    // Only a new refusal moves focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failure]);

  return {
    formRef,
    shown: {
      ...(failure.field && { [failure.field.name]: failure.field.message }),
      ...problems,
    } as PlainProblems<K>,
    edited: (name) => setProblems((now) => ({ ...now, [name]: undefined })),
    refuse: (found) => {
      const first = order.find((name) => found[name] !== undefined);
      if (first === undefined) {
        setProblems({});
        return false;
      }
      flushSync(() => setProblems(found));
      focus(first);
      return true;
    },
  };
}
