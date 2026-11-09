import type { Route } from 'next';
import type { ReactElement } from 'react';
import { helpPath } from '../../lib/help-paths';
import { ViewLink } from '../IconTip';
import type { HelpViewLinkProps } from './types';

// Only a shown article or guide under a shown guide, or none, has a page a reader finder opens; an FAQ entry or a term is an anchor
// on a list, and a hidden row's address is a 404 to a keeper too.
const HelpViewLink = ({ article, parent }: HelpViewLinkProps): ReactElement | null => {
  if (
    (article.kind !== 'article' && article.kind !== 'guide') ||
    !article.shown ||
    (parent && !parent.shown)
  )
    return null;
  const href = helpPath({ ...article, parentSlug: parent?.slug ?? null });
  return <ViewLink href={href as Route} />;
};

export default HelpViewLink;
