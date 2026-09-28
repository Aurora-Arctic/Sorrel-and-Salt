// The ingredients module's behaviour surface. Schema tables are reached at
// `@/modules/ingredients/schema/*`; `services/*`, `graphql/*` and `loaders/*`
// are internal to the module.
export * from './services/duplicates';
export * from './services/common-names';
export * from './services/ingredient-children';
export * from './services/workspace-ingredients';
export * from './loaders/ingredient-children';
export * from './graphql/common-names';
