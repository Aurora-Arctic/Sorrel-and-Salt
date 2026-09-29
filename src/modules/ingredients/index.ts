// The ingredients module's behaviour surface. Schema tables are reached at
// `@/modules/ingredients/schema/*`; `services/*`, `graphql/*` and `loaders/*`
// are internal to the module.
export * from './services/duplicates';
export * from './services/common-names';
export * from './services/ingredient-children';
export * from './services/workspace-ingredients';
export * from './services/compendium';
export * from './loaders/ingredient-children';
export * from './graphql/common-names';
export * from './graphql/ingredient';
export * from './graphql/compendium';
export * from './graphql/workspace-ingredients';
