// The modal, the address-driven RouteModal every admin page opens it through, and the pieces a form
// inside it uses. Two files rather than one, since RouteModal renders Modal and a file that
// re-exported its own importer would be a cycle (claude-docs/components/modal.md).

export { default } from './modal';
export { default as RouteModal } from './route-modal';
export { default as ModalButton } from './modal-button';
export { RouteModalProvider, useOpenModalClick } from './route-modal-provider';
export { ConfirmOverlay } from './confirm-overlay';
export { DiscardQuestion, useDiscardGuard } from './discard';
export { ConfirmQuestion, UNSAVED_CHANGES_LOST } from './confirm-question';
export {
  HeaderNoteContext,
  HeaderSlotContext,
  useModalHeaderNote,
  useModalHeaderSlot,
} from './header-slot';
