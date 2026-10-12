// The modal, and the address-driven wrapper every admin page opens it through,
// with the provider that opens it at once on a press (M9.18).
// Two files rather than one, since RouteModal renders Modal and a file that
// re-exported its own importer would be a cycle (claude-docs/components/modal.md);
// the guard over a form's unsaved changes, which every admin form takes; the
// card a form asks a question in, over itself; and the place beside the title
// a form may put a control in.

export { default } from './modal';
export { default as RouteModal } from './route-modal';
export { RouteModalProvider, useOpenModalClick } from './route-modal-provider';
export { ConfirmOverlay } from './confirm-overlay';
export { DiscardQuestion, useDiscardGuard } from './discard';
export { ConfirmQuestion } from './confirm-question';
export { useModalHeaderSlot } from './header-slot';
