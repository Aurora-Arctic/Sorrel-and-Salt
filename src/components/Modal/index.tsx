// The modal, and the address-driven wrapper every admin page opens it through.
// Two files rather than one, since RouteModal renders Modal and a file that
// re-exported its own importer would be a cycle (claude-docs/components/modal.md).

export { default } from './modal';
export { default as RouteModal } from './route-modal';
