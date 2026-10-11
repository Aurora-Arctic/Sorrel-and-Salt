// The modal, and the address-driven wrapper every admin page opens it through.
// Two files rather than one, since RouteModal renders Modal and a file that
// re-exported its own importer would be a cycle (claude-docs/components/modal.md);
// and the guard over a form's unsaved changes, which every admin form takes.

export { default } from './modal';
export { default as RouteModal } from './route-modal';
export { DiscardQuestion, useDiscardGuard } from './discard';
