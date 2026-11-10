import type { ReactElement } from 'react';
import type { PageColumnProps } from './types';

// The wide page column the lists and the entry pages stand in. A page and its skeleton draw the same
// one, so the skeleton's head and body land where the page's do.
const PageColumn = ({ as: Tag = 'main', className, children }: PageColumnProps): ReactElement => (
  <Tag className={className ? `page-column ${className}` : 'page-column'}>{children}</Tag>
);

export default PageColumn;
