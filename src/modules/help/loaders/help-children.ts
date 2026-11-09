import { defineLoader } from '../../../graphql/loaders/define-loader';
import { helpChildrenOf } from '../services/help-children';
import type { HelpArticle } from '../types';

// Not a signed-in loader: a signed-out reader's children are the public ones.
export const helpChildrenByParent = defineLoader<string, HelpArticle[]>(helpChildrenOf);
