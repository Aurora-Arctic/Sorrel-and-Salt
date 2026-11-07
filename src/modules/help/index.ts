// The help module's behaviour surface. Its table is reached at `@/modules/help/schema/*`.
export { createHelpArticle, deleteHelpArticle, updateHelpArticle } from './services/help-writes';
export {
  listStaffHelpArticles,
  readHelpArticle,
  readHelpArticleIndex,
  readHelpFaq,
  readHelpGlossary,
  readStaffHelpArticle,
  searchHelp,
} from './services/help-reads';
export { helpChildrenByParent } from './loaders/help-children';
export * from './graphql/help';
export type {
  HelpArticle,
  HelpArticleInput,
  HelpArticlePatch,
  HelpArticleWithChildren,
  HelpAudience,
  HelpArticleKind,
} from './types';
