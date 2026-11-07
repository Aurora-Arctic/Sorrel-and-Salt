import type { ReactElement } from 'react';
import type { PageWithNavProps } from './types';

// A page with a jump menu beside its sections. A page and its skeleton draw the same one, so the
// menu and the sections land where the page's do.
const PageWithNav = ({
  as: Tag = 'main',
  headless,
  className,
  children,
}: PageWithNavProps): ReactElement => (
  <Tag
    className={['page-with-nav', headless && 'page-with-nav--headless', className]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </Tag>
);

export default PageWithNav;
