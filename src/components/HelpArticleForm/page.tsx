import type { ReactElement, ReactNode } from 'react';

/** The keepers' help article page's frame: a back bar over the page, drawn by the pages and their skeleton alike. */
export const HelpArticlePage = ({
  as: Tag = 'main',
  back,
  children,
}: {
  as?: 'main' | 'div';
  back: ReactNode;
  children: ReactNode;
}): ReactElement => (
  <Tag className="help-article-page">
    <div className="back-bar help-article-form__bar">{back}</div>
    {children}
  </Tag>
);
