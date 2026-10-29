import { createContext } from 'react';
import type { ConfirmLayer } from './types';

// Where a form inside a modal draws a question over itself: the layer over the modal's body and the
// hold that makes the body inert while one is asked. A context, since the form sits out of its
// owner's reach (claude-docs/components/modal.md, "Asking over the form"). Null outside a modal.
export const ConfirmLayerContext = createContext<ConfirmLayer | null>(null);
