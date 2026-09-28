// The ingredients module's behaviour surface. Schema tables are reached at
// `@/modules/ingredients/schema/*`; `services/*` and `graphql/*` are internal
// to the module.
export * from './services/duplicates';
export * from './services/common-names';
export * from './graphql/common-names';
