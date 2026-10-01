// The identity module's behaviour surface. Schema tables are reached at
// `@/modules/identity/schema/*`; `services/*`, `graphql/*` and `types.ts` are
// internal to the module.
export * from './services/admin-role';
export * from './services/email';
export * from './services/profile';
export * from './services/provisional-accounts';
export * from './services/site-admin';
export * from './services/workshop-access';
export * from './graphql/user';
export type { EmailVerificationSender, PrimaryAdminOutcome, SignInProfile, UserRow } from './types';
