import type { Ref } from 'react';

/** Hands a node to a ref of either kind: a callback ref is called, an object ref is filled. */
export function setRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}
