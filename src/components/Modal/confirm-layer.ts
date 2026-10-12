import { createContext } from 'react';
import type { ConfirmLayer } from './types';

// Where a form inside a modal draws a question over itself (MB.115, the
// owner's call): the layer over the modal's body, below its title, and the
// hold that makes the body inert while a question is asked. A context, as
// the close guard is, since the form sits inside the modal's render prop, out
// of its owner's reach (claude-docs/components/modal.md, "Asking over the
// form"). Null outside a modal: a question there stands in the form's flow.
export const ConfirmLayerContext = createContext<ConfirmLayer | null>(null);
