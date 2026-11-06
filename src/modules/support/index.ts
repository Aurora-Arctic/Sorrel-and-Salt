// The support module's behaviour surface. Schema tables are reached at `@/modules/support/schema/*`; `types.ts` and the services' helpers are
// internal to the module.
export * from './services/send';
export * from './services/signed-out';
export * from './services/anonymous-link';
export * from './services/view-link';
export { redactPath, redactPathForCurator } from './services/redact-path';
export * from './services/own';
export * from './services/staff';
export * from './services/reply';
export * from './services/lifecycle';
export { startSupportRetention } from './services/retention-start';
export * from './services/timeouts';
export * from './services/reads';
export * from './graphql/support';
export * from './loaders/replies-by-request';
export * from './loaders/tier-by-sender';
export * from './loaders/timeouts-by-sender';
export * from './loaders/users-on-requests';
export type {
  AnonymousMinter,
  SupportRequestView,
  SupportAbout,
  SupportNotifier,
  SupportRequestFilter,
  SupportRequestRow,
  SupportStatus,
  SupportStatusMail,
  SupportTimeoutMail,
  SupportTimeoutRow,
  TimeoutNotifier,
} from './types';
