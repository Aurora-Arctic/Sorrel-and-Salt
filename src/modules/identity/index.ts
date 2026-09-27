// The identity module's behaviour surface. Schema tables are reached at
// `@/modules/identity/schema/*`; `services/*` and `graphql/*` are internal to
// the module.
export * from './services/admin-role';
export * from './services/profile';
export * from './services/provisional-accounts';
export * from './services/workshop-access';
export * from './graphql/user';
